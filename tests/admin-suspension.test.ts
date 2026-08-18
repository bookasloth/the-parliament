import { describe, it, expect } from "vitest"
import { suspensionExpiry, isSuspensionActive, suspendSchema } from "@/modules/admin/users"

const T0 = new Date("2026-08-18T00:00:00.000Z")

describe("suspensionExpiry", () => {
  it("returns null for indefinite (no days)", () => {
    expect(suspensionExpiry(undefined, T0)).toBeNull()
  })
  it("adds N days", () => {
    const e = suspensionExpiry(7, T0)!
    expect(e.toISOString()).toBe("2026-08-25T00:00:00.000Z")
  })
})

describe("isSuspensionActive", () => {
  const now = T0
  it("indefinite + not lifted → active", () => {
    expect(isSuspensionActive({ expiresAt: null, liftedAt: null }, now)).toBe(true)
  })
  it("future expiry → active", () => {
    expect(isSuspensionActive({ expiresAt: new Date(T0.getTime() + 86_400_000), liftedAt: null }, now)).toBe(true)
  })
  it("past expiry → inactive", () => {
    expect(isSuspensionActive({ expiresAt: new Date(T0.getTime() - 1), liftedAt: null }, now)).toBe(false)
  })
  it("lifted → inactive regardless of expiry", () => {
    expect(isSuspensionActive({ expiresAt: null, liftedAt: T0 }, now)).toBe(false)
  })
})

describe("suspendSchema", () => {
  it("accepts reason + optional days", () => {
    expect(suspendSchema.parse({ reason: "spam" })).toEqual({ reason: "spam" })
    expect(suspendSchema.parse({ reason: "spam", days: 30 }).days).toBe(30)
  })
  it("rejects short reason and out-of-range days", () => {
    expect(() => suspendSchema.parse({ reason: "x" })).toThrow()
    expect(() => suspendSchema.parse({ reason: "valid reason", days: 0 })).toThrow()
    expect(() => suspendSchema.parse({ reason: "valid reason", days: 4000 })).toThrow()
  })
})
