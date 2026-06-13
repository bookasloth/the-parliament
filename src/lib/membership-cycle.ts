import { BENEFITS, MEMBERSHIP_GRACE_DAYS, PLANS, TIER_PRECEDENCE, type BenefitTier, type PlanCode } from "@/config/membership"

export interface MembershipRow {
  planCode: PlanCode
  benefitTier: BenefitTier
  startedAt: Date
  endsAt: Date | null
  status: string
}

export interface UserLike {
  status: string
  membershipPlanCode?: PlanCode
  createdAt: Date
  isVerified?: boolean
}

export interface ActivePlanResolution {
  planCode: PlanCode
  benefitTier: BenefitTier
  endsAt: Date | null
  inGrace: boolean
  source: "user_field" | "membership_row" | "default_free"
}

export function academicYearFor(date: Date = new Date()): { startYear: number; endYear: number; label: string } {
  const month = date.getMonth()
  const year = date.getFullYear()
  const startYear = month >= 3 ? year : year - 1
  const endYear = startYear + 1
  return { startYear, endYear, label: `${startYear}-${String(endYear).slice(-2)}` }
}

export function nextRenewalDate(paidAt: Date, durationDays = 365): Date {
  const next = new Date(paidAt)
  next.setDate(next.getDate() + durationDays)
  return next
}

export function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime())
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export function daysSinceFirstActive(user: UserLike, now: Date = new Date()): number {
  return daysBetween(user.createdAt, now)
}

export function isWithinGrace(endsAt: Date, now: Date = new Date()): boolean {
  const graceEnd = new Date(endsAt)
  graceEnd.setDate(graceEnd.getDate() + MEMBERSHIP_GRACE_DAYS)
  return now <= graceEnd
}

export function resolveActivePlan(
  user: UserLike,
  memberships: MembershipRow[],
  now: Date = new Date(),
): ActivePlanResolution {
  if (user.status === "inactive" || user.status === "suspended" || user.status === "banned") {
    return { planCode: "inactive", benefitTier: "base", endsAt: null, inGrace: false, source: "user_field" }
  }

  const active = memberships.filter((m) => m.status === "active")

  for (const code of TIER_PRECEDENCE) {
    if (code === "free" || code === "inactive") continue
    const row = active.find((m) => m.planCode === code)
    if (!row) continue

    if (row.endsAt && row.endsAt < now) {
      if (!isWithinGrace(row.endsAt, now)) continue
      return {
        planCode: row.planCode,
        benefitTier: row.benefitTier,
        endsAt: row.endsAt,
        inGrace: true,
        source: "membership_row",
      }
    }

    return {
      planCode: row.planCode,
      benefitTier: row.benefitTier,
      endsAt: row.endsAt,
      inGrace: false,
      source: "membership_row",
    }
  }

  return { planCode: "free", benefitTier: "base", endsAt: null, inGrace: false, source: "default_free" }
}

export function benefitsForTier(tier: BenefitTier) {
  return BENEFITS[tier]
}

export function priceFor(code: PlanCode): number {
  return PLANS[code].priceInr
}

export function isExpiringSoon(endsAt: Date | null, withinDays: number, now: Date = new Date()): boolean {
  if (!endsAt) return false
  const diff = (endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diff > 0 && diff <= withinDays
}
