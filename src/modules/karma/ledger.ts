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
  | "downvote_publisher"
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
}

export interface KarmaBalance {
  balance: number
  earned30d: number
  lifetimeEarned: number
}

export async function awardKarma(input: AwardKarmaInput): Promise<KarmaBalance> {
  const role = input.role ?? "self"
  const applied = new Prisma.Decimal(input.baseValue)

  return prisma.$transaction(async (tx) => {
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

    const positive = applied.gt(0)
    const updated = await tx.userKarma.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        karmaBalance: applied,
        earnedKarma30d: positive ? applied : new Prisma.Decimal(0),
        lifetimeEarned: positive ? applied : new Prisma.Decimal(0),
      },
      update: {
        karmaBalance: { increment: applied },
        ...(positive
          ? {
              earnedKarma30d: { increment: applied },
              lifetimeEarned: { increment: applied },
            }
          : {}),
      },
    })

    return {
      balance: updated.karmaBalance.toNumber(),
      earned30d: updated.earnedKarma30d.toNumber(),
      lifetimeEarned: updated.lifetimeEarned.toNumber(),
    }
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
