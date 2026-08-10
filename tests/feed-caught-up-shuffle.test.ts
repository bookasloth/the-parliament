import { describe, it, expect } from "vitest"
import { planCaughtUpOrder } from "@/modules/feed/impressions"

const ids = Array.from({ length: 20 }, (_, i) => `p${i}`)
const seen = ["p0", "p1", "p2", "p3", "p4"] // p5..p19 unseen

describe("planCaughtUpOrder", () => {
  it("puts never-seen posts before already-seen ones", () => {
    const out = planCaughtUpOrder(ids, seen, 12345)
    const firstSeenIdx = out.findIndex((id) => seen.includes(id))
    const lastUnseenIdx = out.map((id) => !seen.includes(id)).lastIndexOf(true)
    // Every unseen id comes before the first seen id.
    expect(lastUnseenIdx).toBeLessThan(firstSeenIdx)
    expect(out.filter((id) => !seen.includes(id))).toHaveLength(15)
  })

  it("returns every candidate exactly once (no dup/drop)", () => {
    const out = planCaughtUpOrder(ids, seen, 999)
    expect(new Set(out)).toEqual(new Set(ids))
    expect(out).toHaveLength(ids.length)
  })

  it("is deterministic for a given seed (pages stay consistent)", () => {
    expect(planCaughtUpOrder(ids, seen, 42)).toEqual(planCaughtUpOrder(ids, seen, 42))
  })

  it("reshuffles for a different seed (each visit differs)", () => {
    expect(planCaughtUpOrder(ids, seen, 1)).not.toEqual(planCaughtUpOrder(ids, seen, 2))
  })

  it("handles all-seen and empty inputs", () => {
    expect(planCaughtUpOrder(["a"], ["a"], 7)).toEqual(["a"])
    expect(planCaughtUpOrder([], [], 7)).toEqual([])
  })
})
