import { describe, it, expect } from "vitest"
import { scoreCandidate } from "@/modules/verification/ranking"

describe("scoreCandidate", () => {
  it("ranks any vouch above the most-complete profile with none", () => {
    const vouched = scoreCandidate({ endorsedCount: 1, profileCompletion: 0, hasJnvData: false })
    const complete = scoreCandidate({ endorsedCount: 0, profileCompletion: 100, hasJnvData: true })
    expect(vouched).toBeGreaterThan(complete)
  })

  it("orders by profile completion when vouches tie", () => {
    const hi = scoreCandidate({ endorsedCount: 0, profileCompletion: 80, hasJnvData: false })
    const lo = scoreCandidate({ endorsedCount: 0, profileCompletion: 30, hasJnvData: false })
    expect(hi).toBeGreaterThan(lo)
  })

  it("gives JNV data a tie-breaking bump", () => {
    const withJnv = scoreCandidate({ endorsedCount: 0, profileCompletion: 50, hasJnvData: true })
    const without = scoreCandidate({ endorsedCount: 0, profileCompletion: 50, hasJnvData: false })
    expect(withJnv - without).toBe(25)
  })

  it("clamps out-of-range / non-finite completion", () => {
    expect(scoreCandidate({ endorsedCount: 0, profileCompletion: 999, hasJnvData: false })).toBe(100)
    expect(scoreCandidate({ endorsedCount: 0, profileCompletion: -5, hasJnvData: false })).toBe(0)
    expect(scoreCandidate({ endorsedCount: 0, profileCompletion: NaN, hasJnvData: false })).toBe(0)
  })
})
