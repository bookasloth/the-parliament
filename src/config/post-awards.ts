// Canonical post-award catalog — the single source of truth for award key,
// icon name, label and karma cost. The server (modules/feed/posts.ts) and the UI
// (feed-card) both derive from this, so costs/keys can never drift apart.
// `key` is also the value stored on PostAward and requested by the client.
// `icon` is a lucide-react icon name — the UI maps it to the component.

export const POST_AWARD_LIST = [
  { key: "OVATION", icon: "hand-clap", label: "Standing Ovation", cost: 20 },
  { key: "MIND_BLOWN", icon: "zap", label: "Mind Blown", cost: 30 },
  { key: "DEAD", icon: "skull", label: "Dead", cost: 20 },
  { key: "SALUTE", icon: "shield-check", label: "Salute", cost: 35 },
  { key: "FEELS", icon: "heart", label: "Right in the Feels", cost: 25 },
  { key: "FIRE", icon: "flame", label: "Fire", cost: 25 },
  { key: "FACTS", icon: "check-check", label: "Spitting Facts", cost: 30 },
  { key: "TAKE_MY_KARMA", icon: "wallet", label: "Take My Karma", cost: 40 },
  { key: "CHEFS_KISS", icon: "chef-hat", label: "Chef's Kiss", cost: 50 },
] as const

export type AwardKey = (typeof POST_AWARD_LIST)[number]["key"]

/** Server-side lookup: key → { label, cost }. Client cannot pick a cost. */
export const POST_AWARDS: Record<string, { label: string; cost: number }> = Object.fromEntries(
  POST_AWARD_LIST.map((a) => [a.key, { label: a.label, cost: a.cost }]),
)
