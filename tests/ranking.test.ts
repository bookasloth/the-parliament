import { describe, it, expect } from "vitest"
import { hotScore, authorQualitySignal, AUTHOR_SIGNAL, type RankingInput } from "@/modules/feed/ranking"

const base: RankingInput = {
  upvoteCount: 0,
  downvoteCount: 0,
  commentCount: 0,
  shareCount: 0,
  qualityScore: 0,
  reportPenalty: 0,
  createdAt: new Date("2024-01-01T00:00:00Z"),
}

describe("authorQualitySignal", () => {
  it("is zero for a neutral author", () => {
    expect(authorQualitySignal(0)).toBe(0)
  })

  it("is positive for net-upvoted authors, negative for net-downvoted", () => {
    expect(authorQualitySignal(80)).toBe(2) // 80/40
    expect(authorQualitySignal(-120)).toBe(-3) // -120/40
  })

  it("caps the magnitude both ways", () => {
    expect(authorQualitySignal(100_000)).toBe(AUTHOR_SIGNAL.cap)
    expect(authorQualitySignal(-100_000)).toBe(-AUTHOR_SIGNAL.cap)
  })

  it("honors a custom calibration", () => {
    expect(authorQualitySignal(50, { divisor: 10, cap: 3 })).toBe(3) // 50/10=5 capped to 3
    expect(authorQualitySignal(20, { divisor: 10, cap: 3 })).toBe(2)
  })

  it("rounds to 3 decimals", () => {
    // 10/40 = 0.25 exactly; 7/40 = 0.175
    expect(authorQualitySignal(7)).toBe(0.175)
  })
})

describe("hotScore engine behavior", () => {
  it("ranks a downvoted post below an otherwise-identical clean post", () => {
    const clean = hotScore({ ...base, upvoteCount: 10 })
    const trashed = hotScore({ ...base, upvoteCount: 10, downvoteCount: 8 })
    expect(trashed).toBeLessThan(clean)
  })

  it("penalizes a negative author-quality term", () => {
    const good = hotScore({ ...base, upvoteCount: 5, qualityScore: 5 })
    const bad = hotScore({ ...base, upvoteCount: 5, qualityScore: -5 })
    expect(bad).toBeLessThan(good)
  })

  it("subtracts report penalty", () => {
    const clean = hotScore({ ...base, upvoteCount: 20 })
    const reported = hotScore({ ...base, upvoteCount: 20, reportPenalty: 15 })
    expect(reported).toBeLessThan(clean)
  })

  it("ranks a newer post above an older one at equal engagement", () => {
    const older = hotScore({ ...base, upvoteCount: 10, createdAt: new Date("2024-01-01T00:00:00Z") })
    const newer = hotScore({ ...base, upvoteCount: 10, createdAt: new Date("2024-06-01T00:00:00Z") })
    expect(newer).toBeGreaterThan(older)
  })
})
