// Onboarding flow — post-verification wizard.
// Split-screen: left = form, right = live preview.
// Steps: verify email → profile (mandatory) → work → follow → plan → introduce.

// Email is verified before login (see /auth/verify), so onboarding starts at
// the profile step.
export const ONBOARDING_STEPS = ["profile", "work", "follow", "plan", "intro"] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export const STEP_INDEX: Record<OnboardingStep, number> = {
  profile: 0,
  work: 1,
  follow: 2,
  plan: 3,
  intro: 4,
}

export const STEP_LABELS: Record<string, string> = {
  profile: "Profile",
  work: "Work",
  follow: "Follow",
  plan: "Plan",
  intro: "Introduce",
}

// Screen 1 is the only required step; the rest can be skipped.
export const MANDATORY_STEPS: OnboardingStep[] = ["profile"]

// ── Per-step data shapes ─────────────────────────────────────────
export interface ProfileData {
  photoUrl: string // local object URL (preview) or public URL
  photoKey: string // R2 object key (persisted → public URL on save)
  username: string
  bio: string
  location: string
}

export interface WorkData {
  industry: string
  company: string
  position: string
  sinceYear: string
  sinceMonth: string
  current: boolean
}

export interface FollowData {
  followedIds: string[]
}

export interface PlanData {
  planCode: string // student | associate | premium | life
}

export interface IntroData {
  text: string
}

export interface OnboardingData {
  profile: ProfileData
  work: WorkData
  follow: FollowData
  plan: PlanData
  intro: IntroData
}

export const EMPTY_ONBOARDING: OnboardingData = {
  profile: { photoUrl: "", photoKey: "", username: "", bio: "", location: "" },
  work: { industry: "", company: "", position: "", sinceYear: "", sinceMonth: "", current: true },
  follow: { followedIds: [] },
  plan: { planCode: "student" },
  intro: { text: "" },
}

// ── Work pickers ─────────────────────────────────────────────────
export const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Government / Civil Services",
  "Engineering", "Law", "Media & Design", "Consulting", "Manufacturing",
  "Agriculture", "Retail", "Non-profit", "Student", "Other",
] as const

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const

const CURRENT_YEAR = 2026
export const WORK_YEARS = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => String(CURRENT_YEAR - i))

// ── Houses (right panel palette) ─────────────────────────────────
export interface HouseColour {
  name: string
  hex: string
}

export const HOUSES: HouseColour[] = [
  { name: "Aravali", hex: "#5a9bd5" },
  { name: "Nilgiri", hex: "#70ad47" },
  { name: "Shiwalik", hex: "#e8503a" },
  { name: "Udaigiri", hex: "#ffe135" },
  { name: "Indira", hex: "#ff9933" },
  { name: "Laxmi", hex: "#e75480" },
]

// Build an intro post from everything the member entered.
export function buildIntroPost(
  data: OnboardingData,
  opts: { name?: string; batchLabel?: string; houseName?: string } = {},
): string {
  const name = opts.name?.trim()
  const { work, profile } = data
  const lines: string[] = []

  lines.push(name ? `Hi everyone, I'm ${name}! 👋` : "Hi everyone! 👋")

  const roots: string[] = []
  if (opts.houseName) roots.push(`${opts.houseName} House`)
  if (opts.batchLabel) roots.push(`the ${opts.batchLabel} batch`)
  if (roots.length) lines.push(`Proud Navodayan from ${roots.join(", ")} at JNV Nagpur.`)

  if (work.position || work.company) {
    const role = [work.position, work.company].filter(Boolean).join(" at ")
    const tail = work.current && work.sinceYear ? ` (since ${work.sinceYear})` : ""
    lines.push(`I'm currently working as ${role}${tail}.`)
  } else if (work.industry) {
    lines.push(`Working in ${work.industry}.`)
  }

  if (profile.bio.trim()) lines.push(profile.bio.trim())
  if (profile.location.trim()) lines.push(`Based in ${profile.location.trim()}.`)

  lines.push("")
  lines.push("#JNVNagpur #Navodayan #NNAWCA")

  return lines.join("\n")
}
