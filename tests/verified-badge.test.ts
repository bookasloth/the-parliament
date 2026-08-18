import { describe, it, expect } from "vitest"
import { formatVerifiedSince } from "@/components/shared/VerifiedBadge"

describe("formatVerifiedSince", () => {
  it("formats an ISO date as 'Month Year'", () => {
    expect(formatVerifiedSince("2026-08-18T00:00:00.000Z")).toMatch(/^August 202[56]$/)
  })

  it("returns null for null/undefined/empty", () => {
    expect(formatVerifiedSince(null)).toBeNull()
    expect(formatVerifiedSince(undefined)).toBeNull()
    expect(formatVerifiedSince("")).toBeNull()
  })

  it("returns null for an unparseable date", () => {
    expect(formatVerifiedSince("not-a-date")).toBeNull()
  })
})
