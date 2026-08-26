export type PlanCode = "student" | "associate" | "premium" | "life" | "committee" | "inactive"
export type BenefitTier = "base" | "associate" | "premium"

export interface Benefits {
  directory: boolean
  events: boolean
  groups: boolean
  jobs: boolean
  mentorApply: boolean
  welfareDrives: boolean
  scholarshipReports: boolean
  businessListing: boolean
  eventUpdates: boolean
  mentorshipPairing: boolean
  highlightedProfile: boolean
  recognitionWebsite: boolean
  recognitionEvents: boolean
  sevaCells: boolean
  voting: boolean
  scholarshipWall: boolean
  earlyAccessEvents: boolean
  yearlyCertificate: boolean
}

export const BENEFITS: Record<BenefitTier, Benefits> = {
  base: {
    directory: true,
    events: true,
    groups: true,
    jobs: false,
    mentorApply: false,
    welfareDrives: true,
    scholarshipReports: true,
    businessListing: false,
    eventUpdates: true,
    mentorshipPairing: false,
    highlightedProfile: false,
    recognitionWebsite: false,
    recognitionEvents: false,
    sevaCells: false,
    voting: true,
    scholarshipWall: false,
    earlyAccessEvents: false,
    yearlyCertificate: false,
  },
  associate: {
    directory: true,
    events: true,
    groups: true,
    jobs: true,
    mentorApply: false,
    welfareDrives: true,
    scholarshipReports: true,
    businessListing: false,
    eventUpdates: true,
    mentorshipPairing: false,
    highlightedProfile: false,
    recognitionWebsite: false,
    recognitionEvents: false,
    sevaCells: false,
    voting: true,
    scholarshipWall: false,
    earlyAccessEvents: false,
    yearlyCertificate: false,
  },
  premium: {
    directory: true,
    events: true,
    groups: true,
    jobs: true,
    mentorApply: true,
    welfareDrives: true,
    scholarshipReports: true,
    businessListing: true,
    eventUpdates: true,
    mentorshipPairing: true,
    highlightedProfile: true,
    recognitionWebsite: true,
    recognitionEvents: true,
    sevaCells: true,
    voting: true,
    scholarshipWall: true,
    earlyAccessEvents: true,
    yearlyCertificate: true,
  },
}

export interface PlanDefinition {
  code: PlanCode
  displayName: string
  benefitTier: BenefitTier
  priceInr: number
  pricePaise: number
  isPurchasable: boolean
  isSubscription: boolean
  isOneTime: boolean
  durationDays: number | null
  razorpayPlanId: string | null
  description: string
}

const inr = (rupees: number) => rupees * 100

export const PLANS: Record<PlanCode, PlanDefinition> = {
  student: {
    code: "student",
    displayName: "Student",
    benefitTier: "base",
    priceInr: 0,
    pricePaise: 0,
    isPurchasable: false,
    isSubscription: false,
    isOneTime: false,
    durationDays: null,
    razorpayPlanId: null,
    description:
      "Default for every alumnus on signup and for recent graduates (within 5 years of passing out). Permanent, free, no renewal.",
  },
  associate: {
    code: "associate",
    displayName: "Alumni Associate",
    benefitTier: "associate",
    priceInr: 499,
    pricePaise: inr(499),
    isPurchasable: true,
    isSubscription: true,
    isOneTime: false,
    durationDays: 365,
    razorpayPlanId: "assoc_annual_499",
    description: "Stay connected, give back, and grow with the network.",
  },
  premium: {
    code: "premium",
    displayName: "Alumni Premium",
    benefitTier: "premium",
    priceInr: 999,
    pricePaise: inr(999),
    isPurchasable: true,
    isSubscription: true,
    isOneTime: false,
    durationDays: 365,
    razorpayPlanId: "premium_annual_999",
    description: "Lead, mentor, and shape NNAWCA.",
  },
  life: {
    code: "life",
    displayName: "Life Member",
    benefitTier: "premium",
    priceInr: 9999,
    pricePaise: inr(9999),
    isPurchasable: true,
    isSubscription: false,
    isOneTime: true,
    durationDays: null,
    razorpayPlanId: null,
    description: "A lifetime contribution — never renews, never lapses.",
  },
  committee: {
    code: "committee",
    displayName: "Committee Member",
    benefitTier: "premium",
    priceInr: 0,
    pricePaise: 0,
    isPurchasable: false,
    isSubscription: false,
    isOneTime: false,
    durationDays: 365 * 3,
    razorpayPlanId: null,
    description: "Invite-only. Super-admin invites Life Members; 3-year tenure.",
  },
  inactive: {
    code: "inactive",
    displayName: "Inactive",
    benefitTier: "base",
    priceInr: 0,
    pricePaise: 0,
    isPurchasable: false,
    isSubscription: false,
    isOneTime: false,
    durationDays: null,
    razorpayPlanId: null,
    description: "Suspended or banned. No benefits.",
  },
}

export const TIER_PRECEDENCE: PlanCode[] = ["inactive", "committee", "life", "premium", "associate", "student"]

export const PURCHASABLE_PLANS: PlanCode[] = ["associate", "premium", "life"]

/** The default free tier every user falls back to (new signups, expired members). */
export const DEFAULT_PLAN: PlanCode = "student"

/** A graduate is treated as a Student for this many years after passing out. */
export const RECENT_GRAD_YEARS = 5

/** True if the user passed out within RECENT_GRAD_YEARS of `now` (auto-Student). */
export function isRecentGraduate(passOutYear: number | null | undefined, now: Date = new Date()): boolean {
  if (!passOutYear) return false
  return now.getFullYear() - passOutYear <= RECENT_GRAD_YEARS
}

/** The next tier a member can upgrade to, or null if already at the top (life/committee). */
export function nextUpgradeTier(code: PlanCode): PlanCode | null {
  switch (code) {
    case "student":
      return "associate"
    case "associate":
      return "premium"
    case "premium":
      return "life"
    default:
      return null // life, committee, inactive — no upgrade
  }
}

export const MEMBERSHIP_GRACE_DAYS = 30
export const COMMITTEE_INVITE_TTL_DAYS = 7
export const COMMITTEE_DEFAULT_TENURE_YEARS = 3
export const VOTING_MIN_ACTIVE_DAYS = 30

export const ASSOCIATE_TO_PREMIUM_DELTA_INR = PLANS.premium.priceInr - PLANS.associate.priceInr

/* ─────────────────────── Checkout pricing (upgrade flow) ───────────────────────
 * Platform fee is mandatory on every purchase; the dev-support donation is opt-in.
 * `computePricing` is the single source of truth — the client uses it for display,
 * the checkout API re-runs it server-side so the charged amount can't be tampered. */

export const PLATFORM_FEE_INR = 30
export const DEV_SUPPORT_DONATION_INR = 49

export interface Promo {
  code: string
  type: "flat" | "pct"
  value: number // flat: rupees off; pct: percent off the plan price
  label: string
  /** ISO date; the code is dead after this instant. Omit = never expires. */
  expiresAt?: string
  /** Max total redemptions across ALL users. Omit = unlimited. */
  maxRedemptions?: number
}

// ponytail: hardcoded promo table — move to a Coupon model + admin UI when marketing needs self-serve codes.
// [assumption] expiry + cap values are launch-campaign guesses; tune per campaign.
export const PROMO_CODES: Record<string, Promo> = {
  JNV100: { code: "JNV100", type: "flat", value: 100, label: "₹100 off", expiresAt: "2026-12-31T23:59:59Z", maxRedemptions: 1000 },
  FOUNDER20: { code: "FOUNDER20", type: "pct", value: 20, label: "20% off plan price", expiresAt: "2026-12-31T23:59:59Z", maxRedemptions: 500 },
}

export function lookupPromo(code: string | null | undefined): Promo | null {
  if (!code) return null
  return PROMO_CODES[code.trim().toUpperCase()] ?? null
}

/**
 * Whether a promo may still be redeemed: not past its expiry and not over its
 * total-redemption cap. Pure — the checkout route supplies `now` and the current
 * redemption count (from paid orders that used the code); the client can only
 * check expiry (pass redemptions: 0). Keeps `computePricing` pure: the route
 * drops an unredeemable code before pricing, so the math never sees it.
 */
export function isPromoRedeemable(
  promo: Promo | null | undefined,
  opts: { now?: Date; redemptions?: number } = {},
): boolean {
  if (!promo) return false
  const now = opts.now ?? new Date()
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= now.getTime()) return false
  if (promo.maxRedemptions != null && (opts.redemptions ?? 0) >= promo.maxRedemptions) return false
  return true
}

export interface PriceBreakdown {
  basePaise: number
  platformFeePaise: number
  donationPaise: number
  discountPaise: number
  totalPaise: number
  promo: Promo | null
  /** True when `basePaise` is a prorated upgrade delta, not the full plan price. */
  isUpgradeDelta: boolean
}

/**
 * True if moving `from` → `to` is a same-kind subscription upgrade that should
 * be charged as a price delta (and keep the existing renewal date). Today the
 * only such move is associate → premium. Life is one-time (not a subscription),
 * so associate/premium → life always pays the full one-time price.
 */
export function isDeltaUpgrade(from: PlanCode | null | undefined, to: PlanCode): boolean {
  if (!from) return false
  const a = PLANS[from]
  const b = PLANS[to]
  return !!a && a.isSubscription && b.isSubscription && b.pricePaise > a.pricePaise
}

/** Authoritative charge computation. base + optional platform fee + optional donation − promo, clamped ≥ 0. */
export function computePricing(
  planCode: PlanCode,
  opts: { platformFee?: boolean; donate?: boolean; promoCode?: string | null; upgradeFromPlan?: PlanCode | null } = {},
): PriceBreakdown {
  const isUpgradeDelta = isDeltaUpgrade(opts.upgradeFromPlan, planCode)
  const basePaise = isUpgradeDelta
    ? PLANS[planCode].pricePaise - PLANS[opts.upgradeFromPlan!].pricePaise
    : PLANS[planCode].pricePaise
  const platformFeePaise = opts.platformFee ? PLATFORM_FEE_INR * 100 : 0
  const donationPaise = opts.donate ? DEV_SUPPORT_DONATION_INR * 100 : 0
  const promo = lookupPromo(opts.promoCode)
  const discountPaise = promo
    ? promo.type === "flat"
      ? Math.min(promo.value * 100, basePaise)
      : Math.round((basePaise * promo.value) / 100)
    : 0
  const totalPaise = Math.max(0, basePaise + platformFeePaise + donationPaise - discountPaise)
  return { basePaise, platformFeePaise, donationPaise, discountPaise, totalPaise, promo, isUpgradeDelta }
}

export function isPaidTier(code: PlanCode): boolean {
  return code === "associate" || code === "premium" || code === "life" || code === "committee"
}

/**
 * Whether a plan gets the premium "highlighted profile" perk. Reads the single
 * source of truth (the BENEFITS matrix) rather than hardcoding tier names, so
 * listings and the profile page stay in sync with the entitlement config.
 */
export function hasHighlightedProfile(code: PlanCode | string | null | undefined): boolean {
  const plan = code ? PLANS[code as PlanCode] : undefined
  return !!plan && BENEFITS[plan.benefitTier].highlightedProfile
}

export function isBenefitTierAtLeast(have: BenefitTier, need: BenefitTier): boolean {
  const order: BenefitTier[] = ["base", "associate", "premium"]
  return order.indexOf(have) >= order.indexOf(need)
}

/* ───────────────────────── Gallery storage quota ─────────────────────────
 * Total bytes a member may keep in the photo gallery, by tier — a real storage
 * ladder (previously unbounded, a runaway R2/Supabase cost). Keyed by PlanCode
 * so Life can exceed Premium. [assumption] tune these numbers to actual costs. */
const MB = 1024 * 1024
export const TIER_GALLERY_BYTES: Record<PlanCode, number> = {
  student: 200 * MB,
  associate: 1024 * MB, // 1 GB
  premium: 5 * 1024 * MB, // 5 GB
  life: 10 * 1024 * MB, // 10 GB
  committee: 10 * 1024 * MB,
  inactive: 0,
}

/** Gallery storage cap (bytes) for a tier; unknown/legacy values fall back to student. */
export function galleryQuotaBytes(code: PlanCode | string | null | undefined): number {
  return TIER_GALLERY_BYTES[(code as PlanCode)] ?? TIER_GALLERY_BYTES.student
}
