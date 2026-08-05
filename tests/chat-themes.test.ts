import { describe, it, expect } from "vitest"
import { getActiveTheme, formatSchedule, isScheduled, isBirthdayNear, ageYears, FESTIVE_THEMES, DEFAULT_THEME } from "@/config/chat-themes"

// Local-midnight date to match getActiveTheme's local-day logic.
const d = (iso: string) => new Date(`${iso}T12:00:00`)

describe("getActiveTheme — movable festivals (next 5 years)", () => {
  const cases: [string, string][] = [
    ["2026-11-08", "diwali"], ["2027-10-29", "diwali"], ["2031-11-14", "diwali"],
    ["2026-03-04", "holi"], ["2027-03-22", "holi"], ["2029-03-01", "holi"],
    ["2026-03-20", "eid"], ["2031-01-24", "eid"], // Eid al-Fitr
    ["2026-05-27", "eid"], ["2030-04-13", "eid"], // Eid al-Adha
  ]
  it.each(cases)("%s → %s", (date, id) => {
    expect(getActiveTheme(d(date)).id).toBe(id)
  })

  it("does not fire a movable festival on last year's Gregorian date", () => {
    // Diwali 2026 is Nov 8; the old placeholder Oct 29–Nov 3 must be inactive.
    expect(getActiveTheme(d("2026-11-01")).id).not.toBe("diwali")
  })
})

describe("getActiveTheme — fixed holidays still work via annual schedule", () => {
  it.each([
    ["2026-12-25", "christmas"],
    ["2027-01-26", "republic-day"],
    ["2028-08-15", "independence-day"],
    ["2026-02-14", "valentine"],
  ])("%s → %s", (date, id) => {
    expect(getActiveTheme(d(date)).id).toBe(id)
  })

  it("falls back to default on an ordinary day", () => {
    expect(getActiveTheme(d("2026-09-17")).id).toBe(DEFAULT_THEME.id)
  })
})

describe("windows take priority over annual schedules", () => {
  it("Eid al-Fitr 2026 (Mar 20) wins over the Spring window (Mar 20–Apr 10)", () => {
    expect(getActiveTheme(d("2026-03-20")).id).toBe("eid")
  })
})

describe("birthday, minor gate, pride, midnight", () => {
  // Use a noon date so hour-based Midnight never interferes.
  const noon = (iso: string) => new Date(`${iso}T12:00:00`)

  it("birthday context overrides any calendar theme", () => {
    expect(getActiveTheme(noon("2026-12-25"), { birthday: true }).id).toBe("birthday")
    expect(getActiveTheme(noon("2026-12-25")).id).toBe("christmas")
  })

  it("Valentine week (Feb 8–14) shows, but is suppressed for under-18", () => {
    expect(getActiveTheme(noon("2026-02-10")).id).toBe("valentine")
    expect(getActiveTheme(noon("2026-02-10"), { suppressValentine: true }).id).toBe(DEFAULT_THEME.id)
  })

  it("Pride shows all June", () => {
    expect(getActiveTheme(noon("2026-06-01")).id).toBe("pride")
    expect(getActiveTheme(noon("2026-06-30")).id).toBe("pride")
    expect(getActiveTheme(noon("2026-07-01")).id).not.toBe("pride")
  })

  it("Midnight only 00:00–05:59, else default", () => {
    expect(getActiveTheme(new Date("2026-09-17T02:00:00")).id).toBe("midnight")
    expect(getActiveTheme(new Date("2026-09-17T06:00:00")).id).toBe(DEFAULT_THEME.id)
    expect(getActiveTheme(new Date("2026-09-17T12:00:00")).id).toBe(DEFAULT_THEME.id)
  })

  it("a real festival still beats late-night Midnight", () => {
    // Diwali 2026-11-08 at 2 AM → Diwali, not Midnight.
    expect(getActiveTheme(new Date("2026-11-08T02:00:00")).id).toBe("diwali")
  })
})

describe("isBirthdayNear / ageYears", () => {
  const now = new Date("2026-06-15T12:00:00")
  it("matches yesterday/today/tomorrow only", () => {
    expect(isBirthdayNear(new Date("1990-06-15"), now)).toBe(true)
    expect(isBirthdayNear(new Date("1990-06-14"), now)).toBe(true)
    expect(isBirthdayNear(new Date("1990-06-16"), now)).toBe(true)
    expect(isBirthdayNear(new Date("1990-06-17"), now)).toBe(false)
    expect(isBirthdayNear(null, now)).toBe(false)
  })
  it("computes age with birthday not yet reached this year", () => {
    expect(ageYears(new Date("2010-06-14"), now)).toBe(16)
    expect(ageYears(new Date("2010-06-16"), now)).toBe(15)
    expect(ageYears(new Date("2008-06-15"), now)).toBe(18)
  })
})

describe("isScheduled / formatSchedule", () => {
  it("treats movable-festival themes as scheduled, not on-demand", () => {
    const diwali = FESTIVE_THEMES.find((t) => t.id === "diwali")!
    expect(isScheduled(diwali)).toBe(true)
    expect(formatSchedule(diwali, d("2026-01-01"))).toMatch(/Nov 7.*2026/)
  })
  it("shows on-demand themes as such", () => {
    const birthday = FESTIVE_THEMES.find((t) => t.id === "birthday")!
    expect(isScheduled(birthday)).toBe(false)
    expect(formatSchedule(birthday)).toBe("On-demand")
  })
  it("labels Midnight by its hours", () => {
    const midnight = FESTIVE_THEMES.find((t) => t.id === "midnight")!
    expect(isScheduled(midnight)).toBe(true)
    expect(formatSchedule(midnight)).toBe("12 AM–6 AM")
  })
})
