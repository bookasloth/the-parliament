import { describe, it, expect } from "vitest"
import { mergeActor, othersSuffix, ACTOR_IDS_CAP } from "@/modules/notifications/aggregate"

describe("mergeActor", () => {
  it("adds a new distinct actor: bumps count, prepends newest-first", () => {
    const r = mergeActor({ actorCount: 1, actorIds: ["a"] }, "b")
    expect(r).toEqual({ actorCount: 2, actorIds: ["b", "a"] })
  })

  it("ignores a repeat actor (no double-count on rapid re-react)", () => {
    const cur = { actorCount: 2, actorIds: ["b", "a"] }
    expect(mergeActor(cur, "a")).toBe(cur) // unchanged reference
    expect(mergeActor(cur, "b")).toBe(cur)
  })

  it("ignores a missing actorId (some kinds omit it)", () => {
    const cur = { actorCount: 3, actorIds: ["c", "b", "a"] }
    expect(mergeActor(cur, null)).toBe(cur)
    expect(mergeActor(cur, undefined)).toBe(cur)
  })

  it("caps the retained id list but keeps counting", () => {
    let agg = { actorCount: 0, actorIds: [] as string[] }
    for (let i = 0; i < ACTOR_IDS_CAP + 3; i++) agg = mergeActor(agg, `u${i}`)
    expect(agg.actorCount).toBe(ACTOR_IDS_CAP + 3) // every distinct actor counted
    expect(agg.actorIds).toHaveLength(ACTOR_IDS_CAP) // but list is capped
    expect(agg.actorIds[0]).toBe(`u${ACTOR_IDS_CAP + 2}`) // newest first
  })
})

describe("othersSuffix", () => {
  it("is empty for a single actor", () => {
    expect(othersSuffix(1)).toBe("")
    expect(othersSuffix(0)).toBe("")
  })
  it("singular vs plural", () => {
    expect(othersSuffix(2)).toBe("and 1 other")
    expect(othersSuffix(5)).toBe("and 4 others")
  })
})
