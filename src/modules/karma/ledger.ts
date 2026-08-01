import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { KARMA } from "@/config/karma"

export type KarmaAction =
  | "profile_complete"
  | "profile_field"
  | "daily_login"
  | "post_like_actor"
  | "post_like_publisher"
  | "comment_actor"
  | "comment_publisher"
  | "share_actor"
  | "share_publisher"
  | "downvote_post_actor"
  | "downvote_comment_actor"
  | "downvote_publisher"
  | "downvote_comment_publisher"
  | "connection_accepted"
  | "event_attended"
  | "event_hosted"
  | "business_added"
  | "donation"
  | "admin_adjustment"
  | "redemption_spend"

export interface AwardKarmaInput {
  userId: string
  actionType: KarmaAction | string
  baseValue: number
  counterpartyId?: string
  role?: "actor" | "publisher" | "self"
  reasonCode?: string
  entityType?: string
  entityId?: string
  /** Credit balance + lifetime but NOT earned-30d — e.g. payment karma, which must
   *  not buy social unlocks. */
  excludeFromEarned?: boolean
  /** Award at most once for this (userId, actionType, entityId). Makes webhook
   *  retries / double-submits safe. Requires entityId. */
  oncePerEntity?: boolean
}

export interface KarmaBalance {
  balance: number
  earned30d: number
  lifetimeEarned: number
}

// ─────────────────────────────────────────────
// Pure guard math (DB-free, unit-tested).
// ─────────────────────────────────────────────

export type KarmaKind =
  | "like"
  | "comment"
  | "share"
  | "downvote_post"
  | "downvote_comment"
  | "other"

/** Derive the action kind from the (free-form) actionType string. Order matters. */
export function classifyKind(actionType: string): KarmaKind {
  if (/downvote_comment/.test(actionType)) return "downvote_comment"
  if (/downvote/.test(actionType)) return "downvote_post"
  if (/share/.test(actionType)) return "share"
  if (/comment/.test(actionType)) return "comment"
  if (/like/.test(actionType)) return "like"
  return "other"
}

export interface GuardContext {
  role: "actor" | "publisher" | "self"
  /** userId === counterpartyId (self-action) */
  self: boolean
  /** Actor's counts EARLIER today (before this action). */
  likesMade: number
  commentsMade: number
  sharesMade: number
  /** User's net karma accrued so far today (for the negative floor). */
  netKarma: number
  /** Actor→target likes given EARLIER today (before this action). */
  pairLikesGiven: number
  /** Actor already commented on this target within the repeat window. */
  repeatComment: boolean
  /** Target downvoted this actor within the mutual-downvote window. */
  mutualDownvote: boolean
  /** Weight for karma this user GIVES (1 = trusted; <1 for fresh unverified givers). */
  giverWeight: number
}

/** Apply the daily negative floor: once net ≤ -10, further negative is zeroed. */
function floorNegative(value: number, netKarma: number): number {
  if (value >= 0) return value
  if (netKarma <= KARMA.NEGATIVE_DAILY_FLOOR) return 0
  const room = KARMA.NEGATIVE_DAILY_FLOOR - netKarma // ≤ 0
  return Math.max(value, room)
}

/**
 * Compute the karma actually applied for one action, given the day's counts.
 * Pure — all rate-limit/anti-abuse rules live here so they can be tested directly.
 */
export function computeApplied(kind: KarmaKind, baseValue: number, ctx: GuardContext): number {
  // Self-actions (liking your own content, etc.) earn nothing positive.
  if (ctx.self && baseValue > 0) return 0

  if (ctx.role === "actor") {
    switch (kind) {
      case "like": {
        // ponytail: pair cap keyed on the IST day bucket, not a rolling 24h window.
        //   Upgrade to a windowed count only if gaming the midnight boundary matters.
        if (ctx.pairLikesGiven >= KARMA.PAIR_LIKE_CAP) return 0
        if (ctx.likesMade >= KARMA.DAILY_LIKE_CAP) return 0
        return baseValue
      }
      case "comment": {
        let v = ctx.commentsMade >= KARMA.DAILY_COMMENT_CAP ? KARMA.COMMENT_OVER_CAP_ACTOR : baseValue
        if (ctx.repeatComment) v *= KARMA.REPEAT_COMMENT_FACTOR
        return v
      }
      case "share": {
        if (ctx.sharesMade >= KARMA.DAILY_SHARE_CAP) return 0
        return baseValue
      }
      case "downvote_post":
      case "downvote_comment": {
        // Retaliation: voter earns no negative when the target just downvoted them.
        if (ctx.mutualDownvote) return 0
        return floorNegative(baseValue, ctx.netKarma)
      }
      default:
        return floorNegative(baseValue, ctx.netKarma)
    }
  }

  // Publisher / self credit: positive is weighted by the giver's standing (Sybil
  // blunt), negatives are still floored.
  if (baseValue > 0) return baseValue * ctx.giverWeight
  return floorNegative(baseValue, ctx.netKarma)
}

/** Trust weight for karma a giver hands out: full if verified or aged in, else reduced. */
export function giverWeight(giver: { isVerified: boolean; createdAt: Date }, now: Date = new Date()): number {
  if (giver.isVerified) return 1
  const ageDays = (now.getTime() - giver.createdAt.getTime()) / 86_400_000
  return ageDays >= KARMA.GIVER_TRUST_MIN_AGE_DAYS ? 1 : KARMA.GIVER_WEIGHT_UNTRUSTED
}

/** IST calendar day (date-only) for the given instant — matches @db.Date columns. */
export function istDay(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now)
  return new Date(`${ymd}T00:00:00Z`)
}

// ─────────────────────────────────────────────
// Award / spend
// ─────────────────────────────────────────────

export async function awardKarma(input: AwardKarmaInput): Promise<KarmaBalance> {
  const role = input.role ?? "self"
  const kind = classifyKind(input.actionType)
  const self = !!input.counterpartyId && input.counterpartyId === input.userId
  const day = istDay()

  return prisma.$transaction(async (tx) => {
    // Idempotency: never award twice for the same source event (payment webhook
    // retry, double-submit). Return the current balance untouched.
    if (input.oncePerEntity && input.entityId) {
      const prior = await tx.karmaTransaction.findFirst({
        where: { userId: input.userId, actionType: input.actionType, entityId: input.entityId },
        select: { id: true },
      })
      if (prior) {
        const row = await tx.userKarma.findUnique({ where: { userId: input.userId } })
        return {
          balance: row?.karmaBalance.toNumber() ?? 0,
          earned30d: row?.earnedKarma30d.toNumber() ?? 0,
          lifetimeEarned: row?.lifetimeEarned.toNumber() ?? 0,
        }
      }
    }

    const incLike = role === "actor" && kind === "like"
    const incComment = role === "actor" && kind === "comment"
    const incShare = role === "actor" && kind === "share"

    // Increment the action counters FIRST and read the post-increment totals. The row
    // lock the upsert takes serializes concurrent actions, so a cap can't leak under a
    // burst (read-then-write would). netKarma is untouched here, so the returned value
    // is the day's net BEFORE this action (needed by the negative floor).
    const counter = await tx.karmaDailyCounter.upsert({
      where: { userId_dayIst: { userId: input.userId, dayIst: day } },
      create: {
        userId: input.userId,
        dayIst: day,
        likesMade: incLike ? 1 : 0,
        commentsMade: incComment ? 1 : 0,
        sharesMade: incShare ? 1 : 0,
        netKarma: new Prisma.Decimal(0),
      },
      update: {
        ...(incLike ? { likesMade: { increment: 1 } } : {}),
        ...(incComment ? { commentsMade: { increment: 1 } } : {}),
        ...(incShare ? { sharesMade: { increment: 1 } } : {}),
      },
    })
    const netKarma = counter.netKarma.toNumber()
    const likesMade = counter.likesMade - (incLike ? 1 : 0)
    const commentsMade = counter.commentsMade - (incComment ? 1 : 0)
    const sharesMade = counter.sharesMade - (incShare ? 1 : 0)

    let pairLikesGiven = 0
    if (incLike && input.counterpartyId) {
      const pair = await tx.karmaPairDay.upsert({
        where: {
          actorId_targetId_dayIst: {
            actorId: input.userId,
            targetId: input.counterpartyId,
            dayIst: day,
          },
        },
        create: {
          actorId: input.userId,
          targetId: input.counterpartyId,
          dayIst: day,
          likesGiven: 1,
          positiveGiven: new Prisma.Decimal(0),
        },
        update: { likesGiven: { increment: 1 } },
      })
      pairLikesGiven = pair.likesGiven - 1
    }

    // Sybil blunt: weight karma the giver hands to the publisher by the giver's standing.
    let weight = 1
    if (role === "publisher" && input.baseValue > 0 && input.counterpartyId) {
      const giver = await tx.user.findUnique({
        where: { id: input.counterpartyId },
        select: { isVerified: true, createdAt: true },
      })
      if (giver) weight = giverWeight(giver)
    }

    let repeatComment = false
    if (role === "actor" && kind === "comment" && input.counterpartyId) {
      const since = new Date(Date.now() - KARMA.REPEAT_COMMENT_WINDOW_MIN * 60_000)
      const prior = await tx.karmaTransaction.findFirst({
        where: {
          userId: input.userId,
          counterpartyId: input.counterpartyId,
          actionType: { contains: "comment" },
          role: "actor",
          createdAt: { gte: since },
        },
        select: { id: true },
      })
      repeatComment = !!prior
    }

    let mutualDownvote = false
    if (role === "actor" && (kind === "downvote_post" || kind === "downvote_comment") && input.counterpartyId) {
      const since = new Date(Date.now() - KARMA.MUTUAL_DOWNVOTE_WINDOW_HOURS * 3_600_000)
      const retaliated = await tx.karmaTransaction.findFirst({
        where: {
          userId: input.counterpartyId,
          counterpartyId: input.userId,
          actionType: { contains: "downvote" },
          role: "actor",
          createdAt: { gte: since },
        },
        select: { id: true },
      })
      mutualDownvote = !!retaliated
    }

    const appliedNum = computeApplied(kind, input.baseValue, {
      role,
      self,
      likesMade,
      commentsMade,
      sharesMade,
      netKarma,
      pairLikesGiven,
      repeatComment,
      mutualDownvote,
      giverWeight: weight,
    })
    const applied = new Prisma.Decimal(appliedNum)
    const positive = applied.gt(0)

    await tx.karmaTransaction.create({
      data: {
        userId: input.userId,
        counterpartyId: input.counterpartyId,
        role,
        actionType: input.actionType,
        baseValue: new Prisma.Decimal(input.baseValue),
        appliedValue: applied,
        reasonCode: input.reasonCode,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    })

    // Balance is clamped at TOTAL_FLOOR (never below zero) — needs a read, so upsert
    // can't use increment here.
    const existing = await tx.userKarma.findUnique({ where: { userId: input.userId } })
    const prevBalance = existing?.karmaBalance.toNumber() ?? 0
    const nextBalance = Math.max(KARMA.TOTAL_FLOOR, prevBalance + appliedNum)
    // Payment karma (excludeFromEarned) still grows lifetime + balance, but never
    // the 30-day pool that gates social unlocks — money can't buy Mentor.
    const earnInc = positive && !input.excludeFromEarned ? appliedNum : 0
    const lifeInc = positive ? appliedNum : 0

    const updated = await tx.userKarma.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        karmaBalance: new Prisma.Decimal(Math.max(KARMA.TOTAL_FLOOR, appliedNum)),
        earnedKarma30d: new Prisma.Decimal(earnInc),
        lifetimeEarned: new Prisma.Decimal(lifeInc),
      },
      update: {
        karmaBalance: new Prisma.Decimal(nextBalance),
        earnedKarma30d: { increment: earnInc },
        lifetimeEarned: { increment: lifeInc },
      },
    })

    // Counts were already incremented up front; now fold in the karma actually applied.
    await tx.karmaDailyCounter.update({
      where: { userId_dayIst: { userId: input.userId, dayIst: day } },
      data: { netKarma: { increment: applied } },
    })

    if (incLike && input.counterpartyId) {
      await tx.karmaPairDay.update({
        where: {
          actorId_targetId_dayIst: {
            actorId: input.userId,
            targetId: input.counterpartyId,
            dayIst: day,
          },
        },
        data: { positiveGiven: { increment: applied } },
      })
    }

    return {
      balance: updated.karmaBalance.toNumber(),
      earned30d: updated.earnedKarma30d.toNumber(),
      lifetimeEarned: updated.lifetimeEarned.toNumber(),
    }
  })
}

/**
 * Award karma for a confirmed membership payment. Perks-only (never feeds the
 * 30-day unlock pool) and idempotent per order. First time a user reaches a tier
 * pays that tier's value; renewing the same tier pays the flat renewal value.
 *
 * ponytail: renewal is detected by an out-of-txn lookup, so two simultaneous
 *   same-tier orders for one user could both pay tier value. Vanishingly rare
 *   (one person, two concurrent purchases); add a unique guard only if it shows up.
 */
export async function awardMembershipKarma(
  userId: string,
  planCode: string,
  orderId: string,
): Promise<void> {
  const tier = KARMA.MEMBERSHIP_KARMA[planCode]
  if (!tier) return // non-purchasable / unknown tier → no karma
  const prior = await prisma.karmaTransaction.findFirst({
    where: { userId, actionType: "membership_payment", reasonCode: planCode },
    select: { id: true },
  })
  await awardKarma({
    userId,
    actionType: "membership_payment",
    baseValue: prior ? KARMA.MEMBERSHIP_RENEWAL : tier,
    role: "self",
    reasonCode: planCode,
    entityType: "payment",
    entityId: orderId,
    excludeFromEarned: true,
    oncePerEntity: true,
  })
}

export async function spendKarma(input: {
  userId: string
  amount: number
  reasonCode: string
  entityType?: string
  entityId?: string
}): Promise<KarmaBalance> {
  if (input.amount <= 0) throw new Error("spend amount must be positive")
  const balance = await getBalance(input.userId)
  if (balance.balance < input.amount) {
    throw new InsufficientKarmaError(input.amount, balance.balance)
  }
  return awardKarma({
    userId: input.userId,
    actionType: "redemption_spend",
    baseValue: -input.amount,
    reasonCode: input.reasonCode,
    entityType: input.entityType,
    entityId: input.entityId,
  })
}

export async function getBalance(userId: string): Promise<KarmaBalance> {
  const row = await prisma.userKarma.findUnique({ where: { userId } })
  if (!row) return { balance: 0, earned30d: 0, lifetimeEarned: 0 }
  return {
    balance: row.karmaBalance.toNumber(),
    earned30d: row.earnedKarma30d.toNumber(),
    lifetimeEarned: row.lifetimeEarned.toNumber(),
  }
}

export function thresholdFor(balance: number): {
  level: "reader" | "commenter" | "poster" | "poller" | "group_leader" | "mentor"
  canComment: boolean
  canPost: boolean
  canCreatePoll: boolean
  canCreateGroup: boolean
} {
  return {
    level:
      balance >= 500
        ? "mentor"
        : balance >= 250
          ? "group_leader"
          : balance >= KARMA.UNLOCKS.POLLS
            ? "poller"
            : balance >= 50
              ? "poster"
              : balance >= 25
                ? "commenter"
                : "reader",
    canComment: true,
    canPost: balance >= 0,
    canCreatePoll: balance >= KARMA.UNLOCKS.POLLS,
    canCreateGroup: balance >= KARMA.UNLOCKS.CREATE_GROUP,
  }
}

export class InsufficientKarmaError extends Error {
  constructor(required: number, available: number) {
    super(`Insufficient karma: needs ${required}, has ${available}`)
    this.name = "InsufficientKarmaError"
  }
}
