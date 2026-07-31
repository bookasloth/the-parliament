// Canonical post-award catalog — the single source of truth for award key,
// emoji, label and karma cost. The server (modules/feed/posts.ts) and the UI
// (feed-card) both derive from this, so costs/keys can never drift apart.
// `key` is also the value stored on PostAward and requested by the client.

export const POST_AWARD_LIST = [
  { key: "GOAT", emoji: "🐐", label: "GOAT", cost: 50 },
  { key: "SHITPOST", emoji: "💩", label: "Shitpost", cost: 20 },
  { key: "FIRE", emoji: "🔥", label: "Fire Post", cost: 30 },
  { key: "BRAIN", emoji: "🧠", label: "Big Brain", cost: 40 },
  { key: "LOL", emoji: "😂", label: "LOL", cost: 25 },
  { key: "MICDROP", emoji: "🎤", label: "Mic Drop", cost: 35 },
  { key: "SUPPORT", emoji: "💪", label: "Support", cost: 30 },
  { key: "WTF", emoji: "🤯", label: "WTF", cost: 28 },
  { key: "CLAP", emoji: "👏", label: "Clap", cost: 22 },
  { key: "CROWN", emoji: "👑", label: "Crown", cost: 60 },
  { key: "ANGEL", emoji: "😇", label: "Angel", cost: 45 },
  { key: "ROCKET", emoji: "🚀", label: "Rocket", cost: 55 },
] as const

export type AwardKey = (typeof POST_AWARD_LIST)[number]["key"]

/** Server-side lookup: key → { label, cost }. Client cannot pick a cost. */
export const POST_AWARDS: Record<string, { label: string; cost: number }> = Object.fromEntries(
  POST_AWARD_LIST.map((a) => [a.key, { label: a.label, cost: a.cost }]),
)
