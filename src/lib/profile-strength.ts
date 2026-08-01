// Profile completion scoring — pure logic, DB-free, unit-tested.
// Drives the "Profile Strength" ring, tier badge, and next-best-action nudges
// on /profile/edit. Weights sum to 100.

export type StrengthTab = "account" | "contact" | "education" | "social"

export interface StrengthInput {
  firstName?: string
  lastName?: string
  username?: string
  headline?: string
  bio?: string
  hasCover?: boolean
  houseId?: string
  batchId?: string
  city?: string
  phone?: string
  industry?: string
  company?: string
  designation?: string
  higherEducation?: string
  skills?: string[]
  socialCount?: number
}

export interface StrengthItem {
  key: string
  label: string
  points: number
  done: boolean
  tab: StrengthTab
}

export interface StrengthTier {
  key: "seedling" | "sprout" | "established" | "star"
  label: string
  /** Brand-token colour (hex) for the tier badge. */
  color: string
}

export interface StrengthResult {
  score: number
  tier: StrengthTier
  items: StrengthItem[]
  /** Incomplete items, richest-first — for "next best action" nudges. */
  next: StrengthItem[]
  complete: boolean
}

const has = (s?: string) => !!s && s.trim().length > 0

/** Tier thresholds — JNV-themed growth ladder. */
export function tierFor(score: number): StrengthTier {
  if (score >= 90) return { key: "star", label: "Navodayan Star", color: "#B8860B" }
  if (score >= 65) return { key: "established", label: "Established", color: "#009ae4" }
  if (score >= 35) return { key: "sprout", label: "Sprout", color: "#4CAF50" }
  return { key: "seedling", label: "Seedling", color: "#94a3b8" }
}

export function computeStrength(input: StrengthInput): StrengthResult {
  const items: StrengthItem[] = [
    { key: "name", label: "Name & username", points: 10, tab: "account", done: has(input.firstName) && has(input.lastName) && has(input.username) },
    { key: "headline", label: "Headline", points: 12, tab: "account", done: has(input.headline) },
    { key: "cover", label: "Cover photo", points: 10, tab: "account", done: !!input.hasCover },
    { key: "bio", label: "Overview", points: 8, tab: "account", done: has(input.bio) },
    { key: "jnv", label: "House & batch", points: 12, tab: "account", done: has(input.houseId) && has(input.batchId) },
    { key: "city", label: "City", points: 6, tab: "contact", done: has(input.city) },
    { key: "phone", label: "Phone number", points: 8, tab: "contact", done: has(input.phone) },
    { key: "industry", label: "Industry", points: 6, tab: "education", done: has(input.industry) },
    { key: "work", label: "Company & designation", points: 8, tab: "education", done: has(input.company) && has(input.designation) },
    { key: "education", label: "Education", points: 6, tab: "education", done: has(input.higherEducation) },
    { key: "skills", label: "Skills", points: 8, tab: "education", done: (input.skills?.length ?? 0) > 0 },
    { key: "social", label: "Social links", points: 6, tab: "social", done: (input.socialCount ?? 0) > 0 },
  ]

  const score = Math.min(100, items.reduce((sum, it) => sum + (it.done ? it.points : 0), 0))
  const next = items.filter((it) => !it.done).sort((a, b) => b.points - a.points)

  return { score, tier: tierFor(score), items, next, complete: score >= 100 }
}
