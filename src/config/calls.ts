import type { PlanCode } from "@/config/membership"

/* ───────────────────────── Video calling config ─────────────────────────
 * Single source of truth for who can call, for how long, and what a student
 * pays. Mirrors the karma.ts pattern: tune numbers here, no code changes.
 *
 * Quota model (Claude-token style): a member may start a call only if their
 * usage passes EVERY active rolling window (per-call, per-day, per-week,
 * per-month). Windows are ROLLING (day = last 24h, week = last 7d,
 * month = last 30d) — simpler and fairer than calendar resets, no cron needed.
 *
 * Students get NO included calling — they buy a single 30-min pass (₹30).
 * A global monthly platform budget acts as a kill-switch so we never silently
 * overrun the LiveKit free tier. */

/** Minutes in each rolling window. */
export const WINDOW_MINUTES = { day: 24 * 60, week: 7 * 24 * 60, month: 30 * 24 * 60 } as const

export interface TierCallLimits {
  /** Max length of any single call. */
  perCallMin: number
  /** null = unlimited for that window. */
  perDayMin: number | null
  perWeekMin: number | null
  perMonthMin: number | null
}

/** null tier = no included calling (student / inactive). */
export const TIER_CALL_LIMITS: Record<PlanCode, TierCallLimits | null> = {
  student: null,
  inactive: null,
  associate: { perCallMin: 30, perDayMin: 60, perWeekMin: 240, perMonthMin: 600 },
  premium: { perCallMin: 60, perDayMin: 120, perWeekMin: 500, perMonthMin: 1500 },
  life: { perCallMin: 90, perDayMin: 180, perWeekMin: 700, perMonthMin: 2000 },
  committee: { perCallMin: 90, perDayMin: 180, perWeekMin: 700, perMonthMin: 2000 },
}

/** Student single-session pass. Bought via Razorpay, consumed by one call. */
export const STUDENT_PASS = {
  code: "call_pack_30",
  minutes: 30,
  priceInr: 30,
  pricePaise: 30 * 100,
  /** Unused pass expires this many days after purchase (avoids stale credit). */
  ttlDays: 30,
} as const

/** Global kill-switch: monthly platform WebRTC participant-minute budget.
 *  Default = LiveKit free "Build" tier (5,000 min). When platform usage this
 *  rolling month reaches this, calling auto-disables for everyone until it
 *  falls back under budget. This constant is the only control — raise it (and
 *  redeploy) when you move to the Ship tier (150,000).
 *  ponytail: no runtime admin override yet — a DB-backed settings toggle is the
 *  upgrade path if the budget needs changing without a deploy. The budget sums
 *  only FINISHED stints (CallUsage is written on participant_left), so live
 *  calls can overshoot it slightly before they're metered; the one-call-per-user
 *  guard in the calls service keeps that overshoot bounded. */
export const PLATFORM_MONTHLY_MINUTE_BUDGET = 5000

/** Authoritative check that a Razorpay payment settles a student pass:
 *  actually captured AND for the exact pack price (guards tampered amounts). */
export function packPaymentValid(payment: { status: string; amount: number | string }): boolean {
  return payment.status === "captured" && Number(payment.amount) === STUDENT_PASS.pricePaise
}

export type CallKind = "dm" | "ama"

/** Usage minutes already spent by a user in each rolling window (from CallUsage). */
export interface UsageByWindow {
  day: number
  week: number
  month: number
}

export type QuotaReason = "pass_required" | "tier_excluded" | "day" | "week" | "month"

export interface QuotaDecision {
  allowed: boolean
  /** Present when !allowed. Which limit blocked, or that a pass is needed. */
  reason?: QuotaReason
  /** Cap (minutes) to apply to this call — min of per-call and every window's
   *  remaining. 0 when not allowed. */
  maxCallMinutes: number
}

/**
 * Authoritative quota check for INCLUDED (non-student) calling. Students never
 * pass through here — the route checks their CallPass instead
 * (evaluateQuota returns pass_required for them so a miswired caller fails closed).
 *
 * `usage` must already be summed over the rolling windows from CallUsage rows.
 */
export function evaluateQuota(tier: PlanCode, usage: UsageByWindow): QuotaDecision {
  const limits = TIER_CALL_LIMITS[tier]
  if (!limits) {
    // student → needs a pass; inactive → excluded entirely.
    return { allowed: false, reason: tier === "student" ? "pass_required" : "tier_excluded", maxCallMinutes: 0 }
  }

  const remaining = (limit: number | null, spent: number) =>
    limit === null ? Infinity : Math.max(0, limit - spent)

  const rDay = remaining(limits.perDayMin, usage.day)
  const rWeek = remaining(limits.perWeekMin, usage.week)
  const rMonth = remaining(limits.perMonthMin, usage.month)

  if (rDay <= 0) return { allowed: false, reason: "day", maxCallMinutes: 0 }
  if (rWeek <= 0) return { allowed: false, reason: "week", maxCallMinutes: 0 }
  if (rMonth <= 0) return { allowed: false, reason: "month", maxCallMinutes: 0 }

  const maxCallMinutes = Math.min(limits.perCallMin, rDay, rWeek, rMonth)
  return { allowed: true, maxCallMinutes }
}

/** True if the tier gets calling included (no pass needed). */
export function tierHasCalling(tier: PlanCode): boolean {
  return TIER_CALL_LIMITS[tier] !== null
}

/** Human message for a blocked quota decision (UI + API error body). */
export function quotaMessage(d: QuotaDecision): string {
  switch (d.reason) {
    case "pass_required":
      return `Buy a ${STUDENT_PASS.minutes}-minute call pass for ₹${STUDENT_PASS.priceInr}, or upgrade your membership for included calling.`
    case "tier_excluded":
      return "Your account can't start calls. Reactivate your membership to call."
    case "day":
      return "You've used your calling time for today. Try again tomorrow or upgrade for more."
    case "week":
      return "You've used your calling time for this week. Upgrade for more."
    case "month":
      return "You've used your monthly calling time. It resets on a rolling 30-day basis, or upgrade for more."
    default:
      return "Calling is unavailable right now."
  }
}
