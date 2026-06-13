export type PlanCode = "free" | "associate" | "premium" | "life" | "committee" | "inactive"
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
  free: {
    code: "free",
    displayName: "Free Member",
    benefitTier: "base",
    priceInr: 0,
    pricePaise: 0,
    isPurchasable: false,
    isSubscription: false,
    isOneTime: false,
    durationDays: null,
    razorpayPlanId: null,
    description: "Default for every alumnus on signup. Permanent, no renewal.",
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

export const TIER_PRECEDENCE: PlanCode[] = ["inactive", "committee", "life", "premium", "associate", "free"]

export const PURCHASABLE_PLANS: PlanCode[] = ["associate", "premium", "life"]

export const MEMBERSHIP_GRACE_DAYS = 30
export const COMMITTEE_INVITE_TTL_DAYS = 7
export const COMMITTEE_DEFAULT_TENURE_YEARS = 3
export const VOTING_MIN_ACTIVE_DAYS = 30

export const ASSOCIATE_TO_PREMIUM_DELTA_INR = PLANS.premium.priceInr - PLANS.associate.priceInr

export function isPaidTier(code: PlanCode): boolean {
  return code === "associate" || code === "premium" || code === "life" || code === "committee"
}

export function isBenefitTierAtLeast(have: BenefitTier, need: BenefitTier): boolean {
  const order: BenefitTier[] = ["base", "associate", "premium"]
  return order.indexOf(have) >= order.indexOf(need)
}
