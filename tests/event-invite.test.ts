import { describe, it, expect } from "vitest"
import { EVENT_INVITE_WAVES, statusesForTier } from "@/modules/events/jobs"

describe("event invite priority waves", () => {
  it("orders tiers best-first, 2 hours apart (0h / 2h / 4h / 6h)", () => {
    expect(EVENT_INVITE_WAVES.map((w) => [w.tier, w.delaySeconds])).toEqual([
      ["life", 0],
      ["premium", 7200],
      ["associate", 14400],
      ["student", 21600],
    ])
  })

  it("groups committee with life; every membership tier is covered exactly once", () => {
    expect(statusesForTier("life")).toEqual(["life", "committee"])
    expect(statusesForTier("premium")).toEqual(["premium"])
    const all = EVENT_INVITE_WAVES.flatMap((w) => w.statuses)
    expect(all).toEqual(["life", "committee", "premium", "associate", "student"])
    expect(new Set(all).size).toBe(all.length) // no tier double-invited
  })

  it("returns no statuses for an unknown tier", () => {
    expect(statusesForTier("nope")).toEqual([])
  })
})
