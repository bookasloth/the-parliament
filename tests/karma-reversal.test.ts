import { describe, it, expect } from "vitest"
import { reversalDeltas, isEarnExcludedAction } from "@/modules/karma/ledger"

describe("isEarnExcludedAction", () => {
  it("excludes award + membership karma from the earned pool", () => {
    expect(isEarnExcludedAction("post_award_received")).toBe(true)
    expect(isEarnExcludedAction("membership_payment")).toBe(true)
    expect(isEarnExcludedAction("membershipRenewal")).toBe(true)
  })
  it("does not exclude ordinary engagement", () => {
    expect(isEarnExcludedAction("post_like_publisher")).toBe(false)
    expect(isEarnExcludedAction("comment_actor")).toBe(false)
  })
})

describe("reversalDeltas", () => {
  it("reverses a positive like across all three balances", () => {
    expect(reversalDeltas(1.5, "post_like_publisher")).toEqual({
      balanceDelta: -1.5, earnedDelta: -1.5, lifeDelta: -1.5,
    })
  })

  it("reverses an award: balance + lifetime only (never the earned pool)", () => {
    expect(reversalDeltas(20, "post_award_received")).toEqual({
      balanceDelta: -20, earnedDelta: 0, lifeDelta: -20,
    })
  })

  it("refunds a spend: balance only, positive", () => {
    expect(reversalDeltas(-20, "redemption_spend")).toEqual({
      balanceDelta: 20, earnedDelta: 0, lifeDelta: 0,
    })
  })

  it("reverses a downvote-publisher penalty: balance only", () => {
    expect(reversalDeltas(-2, "downvote_publisher")).toEqual({
      balanceDelta: 2, earnedDelta: 0, lifeDelta: 0,
    })
  })

  it("is a no-op when the original was capped to zero", () => {
    expect(reversalDeltas(0, "post_like_actor")).toEqual({
      balanceDelta: 0, earnedDelta: 0, lifeDelta: 0,
    })
  })
})
