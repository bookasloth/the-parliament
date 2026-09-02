import { describe, it, expect } from "vitest"
import { emailBackoffMs, MAX_EMAIL_ATTEMPTS } from "@/modules/email/service"

const MIN = 60_000

describe("emailBackoffMs", () => {
  it("grows exponentially per attempt", () => {
    expect(emailBackoffMs(1)).toBe(2 * MIN)
    expect(emailBackoffMs(2)).toBe(8 * MIN)
    expect(emailBackoffMs(3)).toBe(32 * MIN)
  })
  it("caps at 6 hours", () => {
    expect(emailBackoffMs(4)).toBe(128 * MIN)
    expect(emailBackoffMs(5)).toBe(6 * 60 * MIN) // 512 min → capped
    expect(emailBackoffMs(99)).toBe(6 * 60 * MIN)
  })
  it("has a sane max-attempts constant", () => {
    expect(MAX_EMAIL_ATTEMPTS).toBeGreaterThanOrEqual(3)
  })
})
