import { describe, it, expect } from "vitest"
import { EGGS_CONFIG } from "@/modules/economy/eggs"

describe("eggs config", () => {
  it("signup eggs is 20", () => {
    expect(EGGS_CONFIG.SIGNUP_EGGS).toBe(20)
  })
  it("daily cap is 10", () => {
    expect(EGGS_CONFIG.DAILY_THROW_CAP).toBe(10)
  })
  it("repeat cooldown is 1 hour", () => {
    expect(EGGS_CONFIG.REPEAT_TARGET_COOLDOWN_MS).toBe(3_600_000)
  })
  it("min account age is 7 days", () => {
    expect(EGGS_CONFIG.MIN_ACCOUNT_AGE_DAYS).toBe(7)
  })
})
