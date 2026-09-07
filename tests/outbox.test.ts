import { describe, it, expect } from "vitest"
import { outboxBackoffMs, coalesceKey, groupClaimed, OUTBOX_MAX_ATTEMPTS, type ClaimedRow } from "@/modules/outbox/types"

describe("outboxBackoffMs", () => {
  it("grows exponentially from 30s and caps at 1h", () => {
    expect(outboxBackoffMs(1)).toBe(30_000)
    expect(outboxBackoffMs(2)).toBe(60_000)
    expect(outboxBackoffMs(3)).toBe(120_000)
    expect(outboxBackoffMs(4)).toBe(240_000)
    // strictly non-decreasing
    for (let a = 1; a < 12; a++) expect(outboxBackoffMs(a + 1)).toBeGreaterThanOrEqual(outboxBackoffMs(a))
    // capped
    expect(outboxBackoffMs(50)).toBe(3_600_000)
    // guarded against attempts <= 0
    expect(outboxBackoffMs(0)).toBe(30_000)
  })
})

describe("coalesceKey", () => {
  it("keys on (type, dedupeKey) and falls back to id when dedupeKey is null", () => {
    expect(coalesceKey({ type: "t", dedupeKey: "author-1", id: "row-1" })).toBe("t::author-1")
    expect(coalesceKey({ type: "t", dedupeKey: null, id: "row-1" })).toBe("t::row-1")
    // different types never collide even with the same dedupeKey
    expect(coalesceKey({ type: "a", dedupeKey: "x", id: "1" })).not.toBe(coalesceKey({ type: "b", dedupeKey: "x", id: "2" }))
  })
})

describe("groupClaimed", () => {
  const row = (id: string, dedupeKey: string | null, attempts = 1, type = "recompute_author_ranking"): ClaimedRow => ({
    id, type, dedupeKey, attempts, payload: { authorId: dedupeKey },
  })

  it("coalesces same-key rows into one group holding every id", () => {
    const groups = groupClaimed([row("r1", "a1"), row("r2", "a1"), row("r3", "a2")])
    expect(groups).toHaveLength(2)
    const a1 = groups.find((g) => (g.payload as { authorId: string }).authorId === "a1")!
    expect(a1.ids.sort()).toEqual(["r1", "r2"])
    expect(groups.find((g) => (g.payload as { authorId: string }).authorId === "a2")!.ids).toEqual(["r3"])
  })

  it("takes the max attempts across the group (drives fail/backoff)", () => {
    const groups = groupClaimed([row("r1", "a1", 2), row("r2", "a1", OUTBOX_MAX_ATTEMPTS)])
    expect(groups).toHaveLength(1)
    expect(groups[0].attempts).toBe(OUTBOX_MAX_ATTEMPTS)
  })

  it("never coalesces null-dedupe rows with each other", () => {
    const groups = groupClaimed([row("r1", null), row("r2", null)])
    expect(groups).toHaveLength(2)
  })
})
