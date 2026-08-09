import { describe, it, expect } from "vitest"
import {
  prepareImpressionBatch,
  planExclusions,
  shouldServeCaughtUp,
  IMPRESSION_BATCH_LIMIT,
} from "@/modules/feed/impressions"

describe("prepareImpressionBatch", () => {
  it("dedupes ids and drops empties", () => {
    expect(prepareImpressionBatch(["a", "a", "", "b", "a"])).toEqual(["a", "b"])
  })
  it("caps the batch at the limit", () => {
    const many = Array.from({ length: IMPRESSION_BATCH_LIMIT + 25 }, (_, i) => `p${i}`)
    expect(prepareImpressionBatch(many)).toHaveLength(IMPRESSION_BATCH_LIMIT)
  })
  it("respects a custom limit and preserves first-seen order", () => {
    expect(prepareImpressionBatch(["x", "y", "z"], 2)).toEqual(["x", "y"])
  })
  it("returns [] for an empty iterable", () => {
    expect(prepareImpressionBatch([])).toEqual([])
  })
  it("ignores non-string entries defensively", () => {
    // @ts-expect-error — exercising the runtime guard against bad client input
    expect(prepareImpressionBatch(["a", null, undefined, 3, "b"])).toEqual(["a", "b"])
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
