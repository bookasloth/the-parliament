import { describe, it, expect } from "vitest"
import { trendingWindowStart, TRENDING_WINDOW_HOURS } from "@/modules/feed/trending"

describe("trendingWindowStart", () => {
  it("defaults to 48h before now", () => {
    const now = new Date("2026-08-10T12:00:00.000Z")
    expect(trendingWindowStart(now).toISOString()).toBe("2026-08-08T12:00:00.000Z")
  })

  it("honours a custom window", () => {
    const now = new Date("2026-08-10T12:00:00.000Z")
    expect(trendingWindowStart(now, 24).toISOString()).toBe("2026-08-09T12:00:00.000Z")
  })

  it("exports a 48h default window", () => {
    expect(TRENDING_WINDOW_HOURS).toBe(48)
  })
})
