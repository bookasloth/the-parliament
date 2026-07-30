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
}

// ponytail: hardcoded promo table — move to a Coupon model + admin UI when marketing needs self-serve codes.
export const PROMO_CODES: Record<string, Promo> = {
  JNV100: { code: "JNV100", type: "flat", value: 100, label: "₹100 off" },
  FOUNDER20: { code: "FOUNDER20", type: "pct", value: 20, label: "20% off plan price" },
}

export function lookupPromo(code: string | null | undefined): Promo | null {
  if (!code) return null
  return PROMO_CODES[code.trim().toUpperCase()] ?? null
}

export interface PriceBreakdown {
  basePaise: number
  platformFeePaise: number
  donationPaise: number
  discountPaise: number
  totalPaise: number
  promo: Promo | null
}

/** Authoritative charge computation. base + optional platform fee + optional donation − promo, clamped ≥ 0. */
export function computePricing(
  planCode: PlanCode,
  opts: { platformFee?: boolean; donate?: boolean; promoCode?: string | null } = {},
): PriceBreakdown {
  const basePaise = PLANS[planCode].pricePaise
  const platformFeePaise = opts.platformFee ? PLATFORM_FEE_INR * 100 : 0
  const donationPaise = opts.donate ? DEV_SUPPORT_DONATION_INR * 100 : 0
  const promo = lookupPromo(opts.promoCode)
  const discountPaise = promo
    ? promo.type === "flat"
      ? Math.min(promo.value * 100, basePaise)
      : Math.round((basePaise * promo.value) / 100)
    : 0
  const totalPaise = Math.max(0, basePaise + platformFeePaise + donationPaise - discountPaise)
  return { basePaise, platformFeePaise, donationPaise, discountPaise, totalPaise, promo }
}

export function isPaidTier(code: PlanCode): boolean {
  return code === "associate" || code === "premium" || code === "life" || code === "committee"
}

export function isBenefitTierAtLeast(have: BenefitTier, need: BenefitTier): boolean {
  const order: BenefitTier[] = ["base", "associate", "premium"]
  return order.indexOf(have) >= order.indexOf(need)
}
