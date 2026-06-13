import { prisma } from "@/lib/prisma"
import {
  BENEFITS,
  MEMBERSHIP_GRACE_DAYS,
  PLANS,
  PURCHASABLE_PLANS,
  ASSOCIATE_TO_PREMIUM_DELTA_INR,
  type PlanCode,
  type BenefitTier,
} from "@/config/membership"
import { isExpiringSoon, resolveActivePlan, type MembershipRow } from "@/lib/membership-cycle"

export interface CurrentMembership {
  planCode: PlanCode
  benefitTier: BenefitTier
  endsAt: Date | null
  inGrace: boolean
  daysUntilExpiry: number | null
  isExpiringSoon: boolean
  benefits: typeof BENEFITS[BenefitTier]
  upgradeOptions: UpgradeOption[]
}

export interface UpgradeOption {
  toPlanCode: PlanCode
  displayName: string
  fullPriceInr: number
  payInr: number
  note: string
}

export async function getCurrent(userId: string): Promise<CurrentMembership> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, createdAt: true, isVerified: true },
  })
  if (!user) throw new Error("User not found")

  const rows = await prisma.membership.findMany({
    where: { userId, status: "active" },
    select: {
      planCode: true,
      benefitTier: true,
      startedAt: true,
      endsAt: true,
      status: true,
    },
  })

  const resolved = resolveActivePlan(
    { status: user.status, createdAt: user.createdAt, isVerified: user.isVerified },
    rows.map((r): MembershipRow => ({
      planCode: r.planCode as PlanCode,
      benefitTier: r.benefitTier as BenefitTier,
      startedAt: r.startedAt,
      endsAt: r.endsAt,
      status: r.status,
    })),
  )

  const now = new Date()
  const daysUntilExpiry = resolved.endsAt
    ? Math.floor((resolved.endsAt.getTime() - now.getTime()) / 86400000)
    : null

  return {
    planCode: resolved.planCode,
    benefitTier: resolved.benefitTier,
    endsAt: resolved.endsAt,
    inGrace: resolved.inGrace,
    daysUntilExpiry,
    isExpiringSoon: isExpiringSoon(resolved.endsAt, 30, now),
    benefits: BENEFITS[resolved.benefitTier],
    upgradeOptions: upgradeOptionsFor(resolved.planCode),
  }
}

function upgradeOptionsFor(current: PlanCode): UpgradeOption[] {
  const options: UpgradeOption[] = []

  if (current === "free") {
    options.push(
      { toPlanCode: "associate", displayName: PLANS.associate.displayName, fullPriceInr: PLANS.associate.priceInr, payInr: PLANS.associate.priceInr, note: "Annual auto-renew" },
      { toPlanCode: "premium", displayName: PLANS.premium.displayName, fullPriceInr: PLANS.premium.priceInr, payInr: PLANS.premium.priceInr, note: "Annual auto-renew · Recommended" },
      { toPlanCode: "life", displayName: PLANS.life.displayName, fullPriceInr: PLANS.life.priceInr, payInr: PLANS.life.priceInr, note: "One-time · never lapses" },
    )
  } else if (current === "associate") {
    options.push(
      {
        toPlanCode: "premium",
        displayName: PLANS.premium.displayName,
        fullPriceInr: PLANS.premium.priceInr,
        payInr: ASSOCIATE_TO_PREMIUM_DELTA_INR,
        note: `Pay only ₹${ASSOCIATE_TO_PREMIUM_DELTA_INR} difference · keeps your renewal date`,
      },
      { toPlanCode: "life", displayName: PLANS.life.displayName, fullPriceInr: PLANS.life.priceInr, payInr: PLANS.life.priceInr, note: "One-time · cancels subscription" },
    )
  } else if (current === "premium") {
    options.push(
      { toPlanCode: "life", displayName: PLANS.life.displayName, fullPriceInr: PLANS.life.priceInr, payInr: PLANS.life.priceInr, note: "One-time · cancels subscription" },
    )
  }

  return options
}

export interface PublicPlan {
  code: PlanCode
  displayName: string
  benefitTier: BenefitTier
  priceInr: number
  isSubscription: boolean
  isOneTime: boolean
  description: string
}

export function listPublicPlans(): PublicPlan[] {
  return PURCHASABLE_PLANS.map((code) => ({
    code,
    displayName: PLANS[code].displayName,
    benefitTier: PLANS[code].benefitTier,
    priceInr: PLANS[code].priceInr,
    isSubscription: PLANS[code].isSubscription,
    isOneTime: PLANS[code].isOneTime,
    description: PLANS[code].description,
  }))
}

export interface MembershipHistoryEntry {
  id: string
  planCode: PlanCode
  benefitTier: BenefitTier
  status: string
  startedAt: Date
  endsAt: Date | null
  amountPaise: number
  source: string
  invoiceNumber: string | null
  invoiceId: string | null
}

export async function getHistory(userId: string): Promise<MembershipHistoryEntry[]> {
  const rows = await prisma.membership.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: {
      order: {
        select: {
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    planCode: r.planCode as PlanCode,
    benefitTier: r.benefitTier as BenefitTier,
    status: r.status,
    startedAt: r.startedAt,
    endsAt: r.endsAt,
    amountPaise: r.amountPaise,
    source: r.source,
    invoiceNumber: r.order?.invoice?.invoiceNumber ?? null,
    invoiceId: r.order?.invoice?.id ?? null,
  }))
}

export const constants = { MEMBERSHIP_GRACE_DAYS }
