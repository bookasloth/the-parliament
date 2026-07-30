// Onboarding flow — post-registration wizard.
// Split-screen: left = process (60%), right = house-colour panel (40%).
// Steps: verify email → work → media & blood → interests → intro post.

export const ONBOARDING_STEPS = ["verify", "work", "media", "interests", "intro"] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export const STEP_INDEX: Record<OnboardingStep, number> = {
  verify: 0,
  work: 1,
  media: 2,
  interests: 3,
  intro: 4,
}

export const STEP_LABELS: Record<string, string> = {
  verify: "Verify",
  work: "Work",
  media: "Profile",
  interests: "Interests",
  intro: "Introduce",
}

// ── Per-step data shapes ─────────────────────────────────────────
export interface VerifyData {
  email: string
  verified: boolean
}

export interface WorkData {
  company: string
  position: string
  sinceYear: string
  sinceMonth: string // revealed only after a year is picked
  sinceDay: string // revealed only after a month is picked
}

export interface MediaData {
  photoUrl: string // object URL / preview (real upload → R2 later)
  coverUrl: string
  bio: string
  bloodGroup: string
  willingToDonate: boolean
}

export interface InterestsData {
  interestIds: string[]
}

export interface IntroData {
  text: string
}

export interface OnboardingData {
  verify: VerifyData
  work: WorkData
  media: MediaData
  interests: InterestsData
  intro: IntroData
}

export const EMPTY_ONBOARDING: OnboardingData = {
  verify: { email: "", verified: false },
  work: { company: "", position: "", sinceYear: "", sinceMonth: "", sinceDay: "" },
  media: { photoUrl: "", coverUrl: "", bio: "", bloodGroup: "", willingToDonate: false },
  interests: { interestIds: [] },
  intro: { text: "" },
}

// ── Interests (pick at least 3) ──────────────────────────────────
export const INTEREST_OPTIONS = [
  { slug: "mentorship", name: "Mentorship" },
  { slug: "networking", name: "Networking" },
  { slug: "jobs", name: "Jobs" },
  { slug: "business", name: "Business" },
  { slug: "events", name: "Events" },
  { slug: "donations", name: "Donations" },
  { slug: "volunteering", name: "Volunteering" },
  { slug: "sports", name: "Sports" },
  { slug: "arts", name: "Arts & Culture" },
] as const

export const MIN_INTERESTS = 3

// ── Work "since" pickers ─────────────────────────────────────────
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const

// Current year down to 1970 (year picked first, then month, then day).
const CURRENT_YEAR = 2026
export const WORK_YEARS = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => String(CURRENT_YEAR - i))

export function daysInMonth(year: number, monthIndex1: number): number {
  // monthIndex1 is 1-12; day 0 of next month = last day of this month.
  return new Date(year, monthIndex1, 0).getDate()
}

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const

// ── Houses (right panel palette) ─────────────────────────────────
// Hexes mirror --color-house-* in globals.css.
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
  opts: { name?: string } = {},
): string {
  const name = opts.name?.trim()
  const { work, media, interests } = data
  const lines: string[] = []

  lines.push(name ? `Hi everyone, I'm ${name}! 👋` : "Hi everyone! 👋")

  if (work.position || work.company) {
    const role = [work.position, work.company].filter(Boolean).join(" at ")
    lines.push(`I'm currently working as ${role}${work.sinceYear ? ` (since ${work.sinceYear})` : ""}.`)
  }

  if (media.bio.trim()) lines.push(media.bio.trim())

  if (interests.interestIds.length) {
    const names = interests.interestIds
      .map((slug) => INTEREST_OPTIONS.find((i) => i.slug === slug)?.name)
      .filter(Boolean)
    if (names.length) lines.push(`Here to connect around ${names.join(", ")}.`)
  }

  if (media.willingToDonate) {
    lines.push(`Happy to help as a blood donor${media.bloodGroup ? ` (${media.bloodGroup})` : ""} if anyone ever needs it. 🩸`)
  }

  const tags = ["#JNVNagpur", "#Navodayan", "#NNAWCA", ...interests.interestIds.map((s) => `#${s}`)]
  lines.push("")
  lines.push(tags.join(" "))

  return lines.join("\n")
}
