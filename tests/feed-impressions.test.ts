import { describe, it, expect } from "vitest"
import {
  prepareImpressionBatch,
  planExclusions,
  shouldServeCaughtUp,
  IMPRESSION_BATCH_LIMIT,
} from "@/modules/feed/impressions"

// Real post ids are canonical UUIDs; ad rows use synthetic ids like "ad-<user>".
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const A = uuid(1)
const B = uuid(2)

describe("prepareImpressionBatch", () => {
  it("dedupes ids and drops empties", () => {
    expect(prepareImpressionBatch([A, A, "", B, A])).toEqual([A, B])
  })
  it("caps the batch at the limit", () => {
    const many = Array.from({ length: IMPRESSION_BATCH_LIMIT + 25 }, (_, i) => uuid(i))
    expect(prepareImpressionBatch(many)).toHaveLength(IMPRESSION_BATCH_LIMIT)
  })
  it("respects a custom limit and preserves first-seen order", () => {
    expect(prepareImpressionBatch([uuid(10), uuid(11), uuid(12)], 2)).toEqual([uuid(10), uuid(11)])
  })
  it("returns [] for an empty iterable", () => {
    expect(prepareImpressionBatch([])).toEqual([])
  })
  it("drops non-uuid (house ad) ids so they never reach the uuid Post.id query", () => {
    // regression for P2007: "invalid input syntax for type uuid: \"ad-bookasloth\""
    expect(prepareImpressionBatch([A, "ad-bookasloth", "ad-123", B])).toEqual([A, B])
    expect(prepareImpressionBatch(["ad-bookasloth"])).toEqual([])
  })
  it("ignores non-string entries defensively", () => {
    // @ts-expect-error — exercising the runtime guard against bad client input
    expect(prepareImpressionBatch([A, null, undefined, 3, B])).toEqual([A, B])
  })
})

describe("planExclusions", () => {
  it("unions hidden and seen ids without duplicates", () => {
    const out = planExclusions(["h1", "shared"], ["s1", "shared"])
    expect(new Set(out)).toEqual(new Set(["h1", "s1", "shared"]))
    expect(out).toHaveLength(3)
  })
  it("handles empty inputs", () => {
    expect(planExclusions([], [])).toEqual([])
    expect(planExclusions(["h1"], [])).toEqual(["h1"])
    expect(planExclusions([], ["s1"])).toEqual(["s1"])
  })
})

describe("shouldServeCaughtUp", () => {
  const SIZE = 15
  it("is true on page 1 when nothing unseen remains but the viewer has seen posts", () => {
    expect(shouldServeCaughtUp({ page: 1, unseenRowCount: 0, seenCount: 10, pageSize: SIZE })).toBe(true)
  })
  it("is true when page 1 comes back under-full (the 1–2-post bug: top it up)", () => {
    expect(shouldServeCaughtUp({ page: 1, unseenRowCount: 2, seenCount: 10, pageSize: SIZE })).toBe(true)
    expect(shouldServeCaughtUp({ page: 1, unseenRowCount: 14, seenCount: 10, pageSize: SIZE })).toBe(true)
  })
  it("is false when page 1 is already full of fresh posts", () => {
    expect(shouldServeCaughtUp({ page: 1, unseenRowCount: SIZE, seenCount: 10, pageSize: SIZE })).toBe(false)
  })
  it("is false on deeper pages (they legitimately end)", () => {
    expect(shouldServeCaughtUp({ page: 2, unseenRowCount: 0, seenCount: 10, pageSize: SIZE })).toBe(false)
  })
  it("is false for a viewer who has seen nothing — a short feed is genuine, not caught-up", () => {
    expect(shouldServeCaughtUp({ page: 1, unseenRowCount: 0, seenCount: 0, pageSize: SIZE })).toBe(false)
    expect(shouldServeCaughtUp({ page: 1, unseenRowCount: 2, seenCount: 0, pageSize: SIZE })).toBe(false)
  })
})
