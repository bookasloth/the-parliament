import { describe, it, expect } from "vitest"
import { sanitizeEmailPrefs, validateNewPassword, EMAIL_PREF_KEYS } from "@/app/(main)/settings/prefs"

describe("sanitizeEmailPrefs", () => {
  it("forces transactional on and coerces each known key to a boolean", () => {
    const out = sanitizeEmailPrefs({ digests: true, engagement: false, marketing: "yes" })
    expect(out.transactional).toBe(true)
    expect(out.digests).toBe(true)
    expect(out.engagement).toBe(false)
    expect(out.marketing).toBe(false) // non-true coerces to false
  })
  it("defaults missing keys to false and drops unknown keys", () => {
    const out = sanitizeEmailPrefs({ hacker: true }) as Record<string, unknown>
    for (const k of EMAIL_PREF_KEYS) expect(out[k]).toBe(false)
    expect(out.hacker).toBeUndefined()
    expect(out.transactional).toBe(true) // still unblockable
  })
})

describe("validateNewPassword", () => {
  it("accepts a valid matching password", () => {
    expect(validateNewPassword("supersecret", "supersecret")).toBeNull()
  })
  it("rejects too-short, too-long, and mismatched", () => {
    expect(validateNewPassword("short", "short")).toMatch(/8 characters/)
    expect(validateNewPassword("x".repeat(201), "x".repeat(201))).toMatch(/too long/)
    expect(validateNewPassword("supersecret", "supersecre")).toMatch(/don't match/)
  })
})
