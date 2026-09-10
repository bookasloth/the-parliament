import { describe, it, expect } from "vitest"
import {
  deliveryStatus,
  buildAdReport,
  reportTotals,
  type DeliveryCount,
} from "@/modules/ads/dashboard"
import { adCatalog, type AdCatalogEntry } from "@/config/ad-tracking"

const CATALOG: AdCatalogEntry[] = [
  { adId: "ad-a", placement: "feed", name: "Alpha", href: "https://a.example" },
  { adId: "ad-b", placement: "feed", name: "Bravo", href: "" },
  { adId: "set-c", placement: "sidebar", name: "Charlie", href: "https://c.example" },
]

describe("deliveryStatus", () => {
  it("is on_track at or above the floor", () => {
    expect(deliveryStatus(10_000, 10_000)).toBe("on_track")
    expect(deliveryStatus(12_000, 10_000)).toBe("on_track")
  })
  it("is building with some but not enough delivery", () => {
    expect(deliveryStatus(1, 10_000)).toBe("building")
    expect(deliveryStatus(9_999, 10_000)).toBe("building")
  })
  it("is none with zero delivery", () => {
    expect(deliveryStatus(0, 10_000)).toBe("none")
  })
})

describe("buildAdReport", () => {
  const windowRows: DeliveryCount[] = [
    { adId: "ad-a", placement: "feed", impressions: 100, clicks: 5 },
    { adId: "set-c", placement: "sidebar", impressions: 400, clicks: 8 },
  ]
  const yearRows: DeliveryCount[] = [
    { adId: "ad-a", placement: "feed", impressions: 12_000, clicks: 300 },
    { adId: "set-c", placement: "sidebar", impressions: 2_500, clicks: 50 },
  ]

  it("emits one row per catalog slot, zero-filling slots with no delivery", () => {
    const rows = buildAdReport(CATALOG, windowRows, yearRows, 10_000)
    expect(rows).toHaveLength(3)
    const bravo = rows.find((r) => r.adId === "ad-b")!
    expect(bravo.impressions).toBe(0)
    expect(bravo.clicks).toBe(0)
    expect(bravo.yearImpressions).toBe(0)
    expect(bravo.status).toBe("none")
  })

  it("joins window + year counts and derives ctr / shortfall / pct / status", () => {
    const rows = buildAdReport(CATALOG, windowRows, yearRows, 10_000)
    const alpha = rows.find((r) => r.adId === "ad-a")!
    expect(alpha.impressions).toBe(100)
    expect(alpha.clicks).toBe(5)
    expect(alpha.ctr).toBeCloseTo(0.05, 6)
    expect(alpha.yearImpressions).toBe(12_000)
    expect(alpha.shortfall).toBe(0)
    expect(alpha.pct).toBe(100) // capped at floor
    expect(alpha.status).toBe("on_track")

    const charlie = rows.find((r) => r.adId === "set-c")!
    expect(charlie.shortfall).toBe(7_500)
    expect(charlie.pct).toBeCloseTo(25, 6)
    expect(charlie.status).toBe("building")
  })

  it("sorts by window impressions desc, then name", () => {
    const rows = buildAdReport(CATALOG, windowRows, yearRows, 10_000)
    expect(rows.map((r) => r.adId)).toEqual(["set-c", "ad-a", "ad-b"])
  })

  it("treats a non-positive floor as fully met (pct 100, no shortfall)", () => {
    const rows = buildAdReport(CATALOG, windowRows, yearRows, 0)
    for (const r of rows) {
      expect(r.pct).toBe(100)
      expect(r.shortfall).toBe(0)
    }
  })
})

describe("reportTotals", () => {
  it("sums impressions/clicks, computes blended ctr, and counts on-track slots", () => {
    const rows = buildAdReport(
      CATALOG,
      [
        { adId: "ad-a", placement: "feed", impressions: 100, clicks: 5 },
        { adId: "set-c", placement: "sidebar", impressions: 300, clicks: 15 },
      ],
      [
        { adId: "ad-a", placement: "feed", impressions: 11_000, clicks: 1 },
        { adId: "set-c", placement: "sidebar", impressions: 500, clicks: 1 },
      ],
      10_000,
    )
    const t = reportTotals(rows)
    expect(t.impressions).toBe(400)
    expect(t.clicks).toBe(20)
    expect(t.ctr).toBeCloseTo(0.05, 6)
    expect(t.slots).toBe(3)
    expect(t.onTrack).toBe(1) // only ad-a cleared the floor
  })

  it("handles an empty report without dividing by zero", () => {
    const t = reportTotals([])
    expect(t).toEqual({ impressions: 0, clicks: 0, ctr: 0, slots: 0, onTrack: 0 })
  })
})

describe("adCatalog (real config)", () => {
  it("lists feed creatives and sidebar sets with readable names and placements", () => {
    const cat = adCatalog()
    expect(cat.length).toBeGreaterThan(0)
    const feed = cat.filter((c) => c.placement === "feed")
    const sidebar = cat.filter((c) => c.placement === "sidebar")
    expect(feed.length).toBeGreaterThan(0)
    expect(sidebar.length).toBeGreaterThan(0)
    // Every entry has a non-empty human name and a known placement.
    for (const c of cat) {
      expect(c.name.length).toBeGreaterThan(0)
      expect(["feed", "sidebar", "email", "alerts", "directory"]).toContain(c.placement)
    }
    // A real sidebar set key gets its friendly label, not the raw key.
    const seo = cat.find((c) => c.adId === "seoAi")
    expect(seo?.name).toBe("SEO / AI Audit")
  })
})
