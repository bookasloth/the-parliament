import { describe, it, expect } from "vitest"
import { isAuthorizedCron } from "@/lib/cron-auth"

describe("isAuthorizedCron", () => {
  it("fails closed when no secret is configured", () => {
    expect(isAuthorizedCron("Bearer anything", undefined)).toBe(false)
    expect(isAuthorizedCron("Bearer anything", "")).toBe(false)
    expect(isAuthorizedCron(null, undefined)).toBe(false)
  })

  it("accepts only the exact matching bearer token", () => {
    expect(isAuthorizedCron("Bearer s3cr3t", "s3cr3t")).toBe(true)
  })

  it("rejects a missing, malformed, or wrong token", () => {
    expect(isAuthorizedCron(null, "s3cr3t")).toBe(false)
    expect(isAuthorizedCron("s3cr3t", "s3cr3t")).toBe(false) // missing "Bearer "
    expect(isAuthorizedCron("Bearer wrong", "s3cr3t")).toBe(false)
    expect(isAuthorizedCron("bearer s3cr3t", "s3cr3t")).toBe(false) // case-sensitive scheme
    expect(isAuthorizedCron("Bearer s3cr3t ", "s3cr3t")).toBe(false) // trailing space
  })
})
