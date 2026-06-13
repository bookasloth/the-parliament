import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { audit } from "@/lib/audit"
import { PLANS, type PlanCode } from "@/config/membership"
import { nextRenewalDate } from "@/lib/membership-cycle"

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
    const previousPlanCode = (user?.membershipStatus ?? "free") as PlanCode

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
      return result
    })
}

function eventTypeFor(source: ActivateInput["source"], prev: PlanCode, next: PlanCode): string {
  if (source === "renewal") return "renewed"
  if (source === "admin_grant") return "granted"
  if (source === "comp") return "granted"
  if (prev === "free") return "purchased"
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
      data: { membershipStatus: "free", benefitTier: "base" },
    })

    await tx.membershipEvent.create({
      data: {
        userId: m.userId,
        type: "expired",
        prevPlan: m.planCode,
        newPlan: "free",
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
