import { describe, it, expect } from "vitest"
import {
  isBusinessFeatured,
  sortFeaturedFirst,
  featuredTermEnd,
  FEATURED_TERM_DAYS,
} from "@/modules/business/featured"

const NOW = new Date("2026-09-10T12:00:00.000Z")
const FUTURE = new Date("2027-01-01T00:00:00.000Z")
const PAST = new Date("2025-01-01T00:00:00.000Z")

describe("featuredTermEnd", () => {
  it("returns now + the term length (365 days)", () => {
    const end = featuredTermEnd(NOW)
    const days = (end.getTime() - NOW.getTime()) / (24 * 60 * 60 * 1000)
    expect(days).toBe(FEATURED_TERM_DAYS)
    expect(FEATURED_TERM_DAYS).toBe(365)
  })
})

describe("isBusinessFeatured", () => {
  it("is true when flagged with no expiry", () => {
    expect(isBusinessFeatured({ featured: true, featuredUntil: null }, NOW)).toBe(true)
  })
  it("is true when flagged and the term is in the future (Date or ISO string)", () => {
    expect(isBusinessFeatured({ featured: true, featuredUntil: FUTURE }, NOW)).toBe(true)
    expect(isBusinessFeatured({ featured: true, featuredUntil: FUTURE.toISOString() }, NOW)).toBe(true)
  })
  it("is false when the term has lapsed, even if the flag is still on", () => {
    expect(isBusinessFeatured({ featured: true, featuredUntil: PAST }, NOW)).toBe(false)
    expect(isBusinessFeatured({ featured: true, featuredUntil: PAST.toISOString() }, NOW)).toBe(false)
  })
  it("is false when not flagged, regardless of the term", () => {
    expect(isBusinessFeatured({ featured: false, featuredUntil: null }, NOW)).toBe(false)
    expect(isBusinessFeatured({ featured: false, featuredUntil: FUTURE }, NOW)).toBe(false)
  })
  it("does not silently drop a paid slot when the term is unparseable", () => {
    expect(isBusinessFeatured({ featured: true, featuredUntil: "not-a-date" }, NOW)).toBe(true)
  })
})

describe("sortFeaturedFirst", () => {
  const mk = (id: string, featured: boolean, featuredUntil: Date | string | null = null) => ({
    id,
    featured,
    featuredUntil,
  })

  it("lifts effectively-featured listings to the top, preserving order within each group", () => {
    const rows = [
      mk("a", false),
      mk("b", true, FUTURE),
      mk("c", false),
      mk("d", true, null),
    ]
    expect(sortFeaturedFirst(rows, NOW).map((r) => r.id)).toEqual(["b", "d", "a", "c"])
  })

  it("demotes an expired-featured listing back into the normal order", () => {
    const rows = [mk("a", false), mk("b", true, PAST), mk("c", true, FUTURE)]
    expect(sortFeaturedFirst(rows, NOW).map((r) => r.id)).toEqual(["c", "a", "b"])
  })

  it("is a no-op ordering when nothing is featured", () => {
    const rows = [mk("a", false), mk("b", false)]
    expect(sortFeaturedFirst(rows, NOW).map((r) => r.id)).toEqual(["a", "b"])
  })

  it("keeps the base order when everything is featured", () => {
    const rows = [mk("a", true, null), mk("b", true, FUTURE)]
    expect(sortFeaturedFirst(rows, NOW).map((r) => r.id)).toEqual(["a", "b"])
  })

  it("does not mutate the input array", () => {
    const rows = [mk("a", false), mk("b", true, null)]
    const copy = [...rows]
    sortFeaturedFirst(rows, NOW)
    expect(rows).toEqual(copy)
  })

  it("handles an empty list", () => {
    expect(sortFeaturedFirst([], NOW)).toEqual([])
  })
})
