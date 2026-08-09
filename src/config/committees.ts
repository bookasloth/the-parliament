// The functional committees mail is routed to. Members are managed by email in
// the admin console (people rotate), so a committee is just a string key here —
// adding a 5th needs only a new entry, no migration. Keep keys stable (stored in
// the DB `committee` column); labels are display-only.

export const COMMITTEES = [
  { key: "alumni_student", label: "Alumni-Student Relation" },
  { key: "sports_culture", label: "Sports and Culture" },
  { key: "tech_media", label: "Tech and Media" },
  { key: "executive", label: "Executive" },
] as const

export type CommitteeKey = (typeof COMMITTEES)[number]["key"]

export const COMMITTEE_KEYS = COMMITTEES.map((c) => c.key) as CommitteeKey[]

export const COMMITTEE_LABELS: Record<CommitteeKey, string> = Object.fromEntries(
  COMMITTEES.map((c) => [c.key, c.label]),
) as Record<CommitteeKey, string>

export function isCommitteeKey(v: string): v is CommitteeKey {
  return (COMMITTEE_KEYS as string[]).includes(v)
}
