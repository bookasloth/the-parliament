import { describe, it, expect } from "vitest"
import { validateAnnouncement } from "@/modules/announcements/validate"

const base = {
  title: "Reunion 2026 is open",
  startsAt: "2026-08-01T10:00",
  endsAt: "2026-08-10T10:00",
}

describe("validateAnnouncement", () => {
  it("accepts a valid payload and trims", () => {
    const r = validateAnnouncement({ ...base, title: "  Hello world  ", body: "  hi  " })
    expect(r.title).toBe("Hello world")
    expect(r.body).toBe("hi")
    expect(r.startsAt instanceof Date).toBe(true)
    expect(r.endsAt.getTime()).toBeGreaterThan(r.startsAt.getTime())
  })

  it("rejects short titles", () => {
    expect(() => validateAnnouncement({ ...base, title: "hi" })).toThrow(/at least 3/)
  })

  it("rejects end <= start", () => {
    expect(() => validateAnnouncement({ ...base, startsAt: "2026-08-10T10:00", endsAt: "2026-08-01T10:00" })).toThrow(/after start/)
    expect(() => validateAnnouncement({ ...base, endsAt: base.startsAt })).toThrow(/after start/)
  })

  it("rejects invalid dates", () => {
    expect(() => validateAnnouncement({ ...base, startsAt: "not-a-date" })).toThrow(/Invalid start/)
    expect(() => validateAnnouncement({ ...base, endsAt: "" })).toThrow(/Invalid end/)
  })

  it("requires CTA label + link together", () => {
    expect(() => validateAnnouncement({ ...base, ctaLabel: "Go" })).toThrow(/needs a link/)
    expect(() => validateAnnouncement({ ...base, ctaHref: "/x" })).toThrow(/needs a label/)
  })

  it("rejects a CTA link that isn't a URL or /path", () => {
    expect(() => validateAnnouncement({ ...base, ctaLabel: "Go", ctaHref: "javascript:alert(1)" })).toThrow(/must be a URL/)
    expect(validateAnnouncement({ ...base, ctaLabel: "Go", ctaHref: "/events/x" }).ctaHref).toBe("/events/x")
    expect(validateAnnouncement({ ...base, ctaLabel: "Go", ctaHref: "https://x.com" }).ctaHref).toBe("https://x.com")
  })
})
