import { describe, it, expect } from "vitest"
import { monthYearToDate, formatMonthYear, formatDuration } from "@/modules/profile/history"

describe("monthYearToDate", () => {
  it("builds first-of-month UTC date", () => {
    expect(monthYearToDate(2022, 6)?.toISOString()).toBe("2022-06-01T00:00:00.000Z")
  })
  it("defaults month to January", () => {
    expect(monthYearToDate(2020)?.toISOString()).toBe("2020-01-01T00:00:00.000Z")
  })
  it("returns null for missing/invalid year", () => {
    expect(monthYearToDate(null)).toBeNull()
    expect(monthYearToDate(undefined)).toBeNull()
    expect(monthYearToDate(NaN)).toBeNull()
  })
  it("clamps out-of-range month to January", () => {
    expect(monthYearToDate(2021, 13)?.getUTCMonth()).toBe(0)
    expect(monthYearToDate(2021, 0)?.getUTCMonth()).toBe(0)
  })
})

describe("formatMonthYear", () => {
  it("formats a date", () => {
    expect(formatMonthYear(new Date(Date.UTC(2022, 5, 1)))).toBe("Jun 2022")
  })
  it("null → Present", () => {
    expect(formatMonthYear(null)).toBe("Present")
  })
})

describe("formatDuration", () => {
  const now = new Date(Date.UTC(2026, 8, 1)) // Sep 2026
  it("years + months, inclusive", () => {
    // Jun 2022 → Sep 2026 = 4 yrs 4 mos inclusive
    expect(formatDuration(new Date(Date.UTC(2022, 5, 1)), null, now)).toBe("4 yrs 4 mos")
  })
  it("single year", () => {
    expect(formatDuration(new Date(Date.UTC(2024, 8, 1)), new Date(Date.UTC(2025, 7, 1)), now)).toBe("1 yr")
  })
  it("months only", () => {
    expect(formatDuration(new Date(Date.UTC(2026, 4, 1)), new Date(Date.UTC(2026, 8, 1)), now)).toBe("5 mos")
  })
  it("same month → 1 mo", () => {
    expect(formatDuration(new Date(Date.UTC(2026, 8, 1)), new Date(Date.UTC(2026, 8, 1)), now)).toBe("1 mo")
  })
  it("no start → empty", () => {
    expect(formatDuration(null, null, now)).toBe("")
  })
})
