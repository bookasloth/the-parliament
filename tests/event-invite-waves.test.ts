import { describe, it, expect } from "vitest"
import { EVENT_INVITE_WAVES, statusesForTier, waveSchedule } from "@/modules/events/invites"

describe("event invite priority waves", () => {
  it("orders tiers best-first, 2 hours apart (0h / 2h / 4h / 6h)", () => {
    expect(EVENT_INVITE_WAVES.map((w) => [w.tier, w.delaySeconds])).toEqual([
      ["life", 0],
      ["premium", 7200],
      ["associate", 14400],
      ["student", 21600],
    ])
  })

  it("groups committee with life; every tier covered exactly once", () => {
    expect(statusesForTier("life")).toEqual(["life", "committee"])
    const all = EVENT_INVITE_WAVES.flatMap((w) => w.statuses)
    expect(all).toEqual(["life", "committee", "premium", "associate", "student"])
    expect(new Set(all).size).toBe(all.length)
  })

  it("returns no statuses for an unknown tier", () => {
    expect(statusesForTier("nope")).toEqual([])
  })

  it("waveSchedule stamps sendAfter at now + each delay", () => {
    const now = 1_700_000_000_000
    const sched = waveSchedule(now)
    expect(sched.map((s) => s.tier)).toEqual(["life", "premium", "associate", "student"])
    expect(sched[0].sendAfter.getTime()).toBe(now)
    expect(sched[1].sendAfter.getTime()).toBe(now + 7200_000)
    expect(sched[3].sendAfter.getTime()).toBe(now + 21600_000)
  })
})
