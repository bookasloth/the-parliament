import { describe, it, expect } from "vitest"
import {
  prepareAdEventBatch,
  dayKeyUTC,
  meetsFloor,
  shortfall,
  ctr,
  AD_EVENT_BATCH_LIMIT,
} from "@/modules/ads/tracking"
import { isKnownAdId } from "@/config/ad-tracking"

// A real feed creative id and a real sidebar set key (the two live placements).
const FEED_AD = "ad-bookasloth"
const SIDEBAR_AD = "seoAi"
const NOW = new Date("2026-09-10T15:30:00.000Z")

describe("isKnownAdId (whitelist derived from the ad configs)", () => {
  it("accepts real feed creatives and sidebar set keys", () => {
    expect(isKnownAdId(FEED_AD)).toBe(true)
    expect(isKnownAdId(SIDEBAR_AD)).toBe(true)
  })
  it("rejects forged / unknown ids", () => {
    expect(isKnownAdId("ad-evil")).toBe(false)
    expect(isKnownAdId("")).toBe(false)
    expect(isKnownAdId("'; DROP TABLE ad_impressions;--")).toBe(false)
  })
})

describe("dayKeyUTC", () => {
  it("buckets to midnight UTC regardless of time of day", () => {
    const d = dayKeyUTC(NOW)
    expect(d.toISOString()).toBe("2026-09-10T00:00:00.000Z")
  })
  it("is stable across different times on the same UTC day", () => {
    const a = dayKeyUTC(new Date("2026-09-10T00:00:01.000Z"))
    const b = dayKeyUTC(new Date("2026-09-10T23:59:59.000Z"))
    expect(a.getTime()).toBe(b.getTime())
  })
  it("rolls to the next bucket at the UTC day boundary", () => {
    const a = dayKeyUTC(new Date("2026-09-10T23:59:59.000Z"))
    const b = dayKeyUTC(new Date("2026-09-11T00:00:00.000Z"))
    expect(b.getTime()).toBeGreaterThan(a.getTime())
  })
})

describe("prepareAdEventBatch — validation", () => {
  const base = { viewerId: "u1", now: NOW }

  it("passes valid feed + sidebar events through with viewer + day attached", () => {
    const out = prepareAdEventBatch(
      [
        { adId: FEED_AD, placement: "feed", kind: "impression" },
        { adId: SIDEBAR_AD, placement: "sidebar", kind: "click" },
      ],
      base,
    )
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ adId: FEED_AD, placement: "feed", kind: "impression", viewerId: "u1" })
    expect(out[0].day.toISOString()).toBe("2026-09-10T00:00:00.000Z")
    expect(out[1]).toMatchObject({ adId: SIDEBAR_AD, placement: "sidebar", kind: "click" })
  })

  it("drops events with an unknown/forged adId", () => {
    const out = prepareAdEventBatch([{ adId: "ad-evil", placement: "feed", kind: "impression" }], base)
    expect(out).toEqual([])
  })

  it("drops events with an unknown placement or kind", () => {
    const out = prepareAdEventBatch(
      [
        { adId: FEED_AD, placement: "banner", kind: "impression" },
        { adId: FEED_AD, placement: "feed", kind: "hover" },
      ],
      base,
    )
    expect(out).toEqual([])
  })

  it("skips malformed / non-object entries without throwing", () => {
    const out = prepareAdEventBatch(
      [null, undefined, 42, "x", {}, { adId: FEED_AD }, { adId: FEED_AD, placement: "feed", kind: "impression" }] as unknown,
      base,
    )
    expect(out).toHaveLength(1)
    expect(out[0].adId).toBe(FEED_AD)
  })

  it("returns [] for non-array input", () => {
    expect(prepareAdEventBatch(null, base)).toEqual([])
    expect(prepareAdEventBatch({ adId: FEED_AD }, base)).toEqual([])
    expect(prepareAdEventBatch(undefined, base)).toEqual([])
  })
})

describe("prepareAdEventBatch — de-dup, kinds, viewer, cap", () => {
  it("collapses duplicate (placement, ad, kind) within one batch", () => {
    const out = prepareAdEventBatch(
      [
        { adId: FEED_AD, placement: "feed", kind: "impression" },
        { adId: FEED_AD, placement: "feed", kind: "impression" },
        { adId: FEED_AD, placement: "feed", kind: "impression" },
      ],
      { viewerId: "u1", now: NOW },
    )
    expect(out).toHaveLength(1)
  })

  it("keeps impression and click for the same ad as distinct rows", () => {
    const out = prepareAdEventBatch(
      [
        { adId: FEED_AD, placement: "feed", kind: "impression" },
        { adId: FEED_AD, placement: "feed", kind: "click" },
      ],
      { viewerId: "u1", now: NOW },
    )
    expect(out).toHaveLength(2)
    expect(new Set(out.map((e) => e.kind))).toEqual(new Set(["impression", "click"]))
  })

  it("carries a null viewer (anonymous) through", () => {
    const out = prepareAdEventBatch([{ adId: FEED_AD, placement: "feed", kind: "impression" }], {
      viewerId: null,
      now: NOW,
    })
    expect(out[0].viewerId).toBeNull()
  })

  it("caps the batch at the given limit (distinct valid events)", () => {
    const out = prepareAdEventBatch(
      [
        { adId: FEED_AD, placement: "feed", kind: "impression" },
        { adId: FEED_AD, placement: "feed", kind: "click" },
        { adId: SIDEBAR_AD, placement: "sidebar", kind: "impression" },
      ],
      { viewerId: "u1", now: NOW, limit: 2 },
    )
    expect(out).toHaveLength(2)
  })

  it("has a sane default batch limit", () => {
    expect(AD_EVENT_BATCH_LIMIT).toBeGreaterThan(0)
    expect(AD_EVENT_BATCH_LIMIT).toBeLessThanOrEqual(50)
  })
})

describe("floor / make-good math", () => {
  it("meetsFloor is true at or above the floor, false below", () => {
    expect(meetsFloor(10_000, 10_000)).toBe(true)
    expect(meetsFloor(12_500, 10_000)).toBe(true)
    expect(meetsFloor(9_999, 10_000)).toBe(false)
    expect(meetsFloor(0, 10_000)).toBe(false)
  })

  it("shortfall is the make-good size, never negative", () => {
    expect(shortfall(4_000, 10_000)).toBe(6_000)
    expect(shortfall(10_000, 10_000)).toBe(0)
    expect(shortfall(12_000, 10_000)).toBe(0)
  })

  it("ctr guards against divide-by-zero and computes the ratio otherwise", () => {
    expect(ctr(0, 0)).toBe(0)
    expect(ctr(0, 5)).toBe(0)
    expect(ctr(1_000, 25)).toBeCloseTo(0.025, 6)
  })
})
