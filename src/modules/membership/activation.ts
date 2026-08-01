import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { audit } from "@/lib/audit"
import { PLANS, type PlanCode } from "@/config/membership"
import { nextRenewalDate } from "@/lib/membership-cycle"
import { queueEmail } from "@/modules/email/service"
import { sendEmail } from "@/lib/email"

export interface ActivateInput {
  userId: string
  planCode: PlanCode
  source: "purchase" | "renewal" | "upgrade" | "admin_grant" | "comp"
  amountPaise: number
  orderId?: string
  razorpaySubscriptionId?: string
  grantedByUserId?: string
  startsAt?: Date
}

export interface ActivateResult {
  membershipId: string
  endsAt: Date | null
  previousPlanCode: PlanCode
  newPlanCode: PlanCode
}

export async function activateMembership(input: ActivateInput): Promise<ActivateResult> {
  const def = PLANS[input.planCode]
  if (!def.isPurchasable && input.source !== "admin_grant" && input.source !== "renewal") {
    throw new Error(`Plan ${input.planCode} cannot be activated via ${input.source}`)
  }

  const startsAt = input.startsAt ?? new Date()
  const endsAt = def.durationDays
    ? nextRenewalDate(startsAt, def.durationDays)
    : null

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { membershipStatus: true, benefitTier: true },
    })
    const previousPlanCode = (user?.membershipStatus ?? "student") as PlanCode

    await tx.membership.updateMany({
      where: { userId: input.userId, status: "active" },
      data: { status: "superseded" },
    })

    const created = await tx.membership.create({
      data: {
        userId: input.userId,
        planCode: input.planCode,
        benefitTier: def.benefitTier,
        startedAt: startsAt,
        endsAt,
        amountPaise: input.amountPaise,
        source: input.source,
        orderId: input.orderId,
        razorpaySubscriptionId: input.razorpaySubscriptionId,
        autoPay: def.isSubscription,
        grantedByUserId: input.grantedByUserId,
        status: "active",
      },
    })

    await tx.user.update({
      where: { id: input.userId },
      data: {
        membershipStatus: input.planCode,
        benefitTier: def.benefitTier,
        membershipCycleStart: startsAt,
        membershipExpiresAt: endsAt,
      },
    })

    await tx.membershipEvent.create({
      data: {
        userId: input.userId,
        type: eventTypeFor(input.source, previousPlanCode, input.planCode),
        prevPlan: previousPlanCode,
        newPlan: input.planCode,
        orderId: input.orderId,
        actorUserId: input.grantedByUserId,
        metadata: { amountPaise: input.amountPaise } as Prisma.InputJsonValue,
      },
    })

    return {
      membershipId: created.id,
      endsAt,
      previousPlanCode,
      newPlanCode: input.planCode,
    }
  })
    .then(async (result) => {
      await audit({
        actorId: input.grantedByUserId ?? input.userId,
        action: `membership.activate.${input.source}`,
        entityType: "membership",
        entityId: result.membershipId,
        payload: {
          userId: input.userId,
          fromPlan: result.previousPlanCode,
          toPlan: result.newPlanCode,
        },
      })
      // Fire the tier welcome email AFTER the tx commits — never inside it, and
      // never let a mail failure fail a paid activation.
      await sendWelcomeEmail(input, result)
      return result
    })
}

/**
 * Which welcome template a freshly-activated tier gets, or null for none.
 * Renewals are skipped (they get the separate "welcome back" mail); student and
 * committee tiers have no welcome. Pure — unit-tested.
 */
export function welcomeTemplateFor(
  planCode: PlanCode,
  source: ActivateInput["source"],
): string | null {
  if (source === "renewal") return null
  if (planCode === "associate") return "membership.welcome_associate"
  if (planCode === "premium") return "membership.welcome_premium"
  if (planCode === "life") return "membership.welcome_life"
  return null
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

async function sendWelcomeEmail(input: ActivateInput, result: ActivateResult): Promise<void> {
  // Renewals get the "welcome back" mail, not a first-time welcome.
  if (input.source === "renewal") return sendRenewalEmail(input, result)

  const templateCode = welcomeTemplateFor(input.planCode, input.source)
  if (!templateCode) return
  try {
    const u = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, legalName: true, username: true },
    })
    if (!u?.email) return
    const firstName = u.legalName?.split(" ")[0] || "there"
    const base = process.env.AUTH_URL || "https://nnawca.org"
    const variables: Record<string, string> =
      input.planCode === "life"
        ? { firstName, profileUrl: u.username ? `${base}/${u.username}` : `${base}/membership` }
        : {
            firstName,
            manageUrl: `${base}/membership`,
            renewalDate: result.endsAt ? fmtDate(result.endsAt) : "—",
          }
    await queueEmail({ templateCode, toAddress: u.email, userId: input.userId, variables })
  } catch (e) {
    console.error(`welcome email (${templateCode}) failed for ${input.userId}`, e)
  }
}

async function sendRenewalEmail(input: ActivateInput, result: ActivateResult): Promise<void> {
  if (!["associate", "premium", "life"].includes(input.planCode)) return
  try {
    const u = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, legalName: true },
    })
    if (!u?.email) return
    const base = process.env.AUTH_URL || "https://nnawca.org"
    await sendEmail(
      "membership_renewed",
      u.email,
      {
        firstName: u.legalName?.split(" ")[0] || "there",
        planName: PLANS[input.planCode].displayName,
        validUntil: result.endsAt ? fmtDate(result.endsAt) : "—",
        manageUrl: `${base}/feed`,
      },
      input.userId,
    )
  } catch (e) {
    console.error(`renewal email failed for ${input.userId}`, e)
  }
}

function eventTypeFor(source: ActivateInput["source"], prev: PlanCode, next: PlanCode): string {
  if (source === "renewal") return "renewed"
  if (source === "admin_grant") return "granted"
  if (source === "comp") return "granted"
  if (prev === "student") return "purchased"
  if (prev === "associate" && next === "premium") return "upgraded"
  if (next === "life" && (prev === "associate" || prev === "premium")) return "upgraded"
  return "purchased"
}

export async function expireMembership(membershipId: string, actorUserId?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const m = await tx.membership.findUnique({ where: { id: membershipId } })
    if (!m || m.status !== "active") return

    await tx.membership.update({
      where: { id: membershipId },
      data: { status: "expired" },
    })

    if (m.planCode === "committee") {
      const lifeRow = await tx.membership.findFirst({
        where: { userId: m.userId, planCode: "life" },
        orderBy: { startedAt: "desc" },
      })
      if (lifeRow) {
        await tx.membership.update({
          where: { id: lifeRow.id },
          data: { status: "active" },
        })
        await tx.user.update({
          where: { id: m.userId },
          data: { membershipStatus: "life", benefitTier: "premium" },
        })
        await tx.membershipEvent.create({
          data: {
            userId: m.userId,
            type: "committee_expired",
            prevPlan: "committee",
            newPlan: "life",
            actorUserId,
          },
        })
        return
      }
    }

    await tx.user.update({
      where: { id: m.userId },
      data: { membershipStatus: "student", benefitTier: "base" },
    })

    await tx.membershipEvent.create({
      data: {
        userId: m.userId,
        type: "expired",
        prevPlan: m.planCode,
        newPlan: "student",
        actorUserId,
      },
    })
  })

  await audit({
    actorId: actorUserId,
    action: "membership.expire",
    entityType: "membership",
    entityId: membershipId,
  })
}
