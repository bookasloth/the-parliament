// Self-check for hotScore invariants. Run: npx tsx scripts/ranking-check.ts
import assert from "node:assert"
import { hotScore } from "../src/modules/feed/ranking"

const zero = {
  upvoteCount: 0,
  downvoteCount: 0,
  commentCount: 0,
  shareCount: 0,
  qualityScore: 0,
  reportPenalty: 0,
}
const older = new Date("2026-01-01T00:00:00Z")
const newer = new Date("2026-06-01T00:00:00Z")

// Newer post outranks older with identical engagement.
assert(hotScore({ ...zero, createdAt: newer }) > hotScore({ ...zero, createdAt: older }), "recency")

// More upvotes outrank fewer at the same time.
assert(
  hotScore({ ...zero, upvoteCount: 50, createdAt: older }) >
    hotScore({ ...zero, upvoteCount: 1, createdAt: older }),
  "engagement",
)

// Engagement uses log scale: 100→1000 upvotes is a smaller jump than 1→10.
const d1 = hotScore({ ...zero, upvoteCount: 10, createdAt: older }) - hotScore({ ...zero, upvoteCount: 1, createdAt: older })
const d2 = hotScore({ ...zero, upvoteCount: 1000, createdAt: older }) - hotScore({ ...zero, upvoteCount: 100, createdAt: older })
assert(Math.abs(d1 - d2) < 1e-6, "log-scaled engagement")

// Reports drag score down.
assert(
  hotScore({ ...zero, upvoteCount: 10, reportPenalty: 8, createdAt: older }) <
    hotScore({ ...zero, upvoteCount: 10, createdAt: older }),
  "report penalty",
)

console.log("ranking-check: all assertions passed")
