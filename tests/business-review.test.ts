import { describe, it, expect } from "vitest"
import { isValidRating, normalizeSocialLinks, sanitizeFoundedYear } from "@/modules/business/service"
import { isOwnedBusinessKey } from "@/lib/r2"

describe("isValidRating", () => {
  it("accepts integers 1 through 5", () => {
    for (const n of [1, 2, 3, 4, 5]) expect(isValidRating(n)).toBe(true)
  })

  it("rejects out-of-range values", () => {
    expect(isValidRating(0)).toBe(false)
    expect(isValidRating(6)).toBe(false)
    expect(isValidRating(-1)).toBe(false)
    expect(isValidRating(100)).toBe(false)
  })

  it("rejects non-integers", () => {
    expect(isValidRating(3.5)).toBe(false)
    expect(isValidRating(NaN)).toBe(false)
    expect(isValidRating(Infinity)).toBe(false)
  })
})

describe("normalizeSocialLinks", () => {
  it("folds website in under the website key", () => {
    expect(normalizeSocialLinks("https://acme.com", null)).toEqual({ website: "https://acme.com" })
  })

  it("lowercases platform keys and trims values", () => {
    expect(normalizeSocialLinks(null, { LinkedIn: "  https://li.com/acme  ", X: "https://x.com/acme" }))
      .toEqual({ linkedin: "https://li.com/acme", x: "https://x.com/acme" })
  })

  it("drops empty/blank and non-string values", () => {
    expect(normalizeSocialLinks("  ", { twitter: "", github: "   ", instagram: 5 as unknown as string, facebook: "https://fb.com/x" }))
      .toEqual({ facebook: "https://fb.com/x" })
  })

  it("handles missing/garbage socialLinks safely", () => {
    expect(normalizeSocialLinks(null, undefined)).toEqual({})
    expect(normalizeSocialLinks(null, ["not", "an", "object"])).toEqual({})
    expect(normalizeSocialLinks(null, "string")).toEqual({})
  })
})

describe("sanitizeFoundedYear", () => {
  const CUR = 2026
  it("accepts a valid 4-digit year in range", () => {
    expect(sanitizeFoundedYear("2015", CUR)).toBe(2015)
    expect(sanitizeFoundedYear(1800, CUR)).toBe(1800)
    expect(sanitizeFoundedYear(CUR, CUR)).toBe(CUR)
  })
  it("rejects out-of-range or future years", () => {
    expect(sanitizeFoundedYear("1799", CUR)).toBeNull()
    expect(sanitizeFoundedYear(CUR + 1, CUR)).toBeNull()
  })
  it("rejects blank / non-numeric / fractional", () => {
    expect(sanitizeFoundedYear("", CUR)).toBeNull()
    expect(sanitizeFoundedYear("  ", CUR)).toBeNull()
    expect(sanitizeFoundedYear("abcd", CUR)).toBeNull()
    expect(sanitizeFoundedYear(2015.5, CUR)).toBeNull()
    expect(sanitizeFoundedYear(null, CUR)).toBeNull()
  })
})

describe("isOwnedBusinessKey", () => {
  it("accepts a key under the caller's own business prefix", () => {
    expect(isOwnedBusinessKey("user-1", "businesses/user-1/abc.png")).toBe(true)
  })
  it("rejects another user's key or a foreign prefix", () => {
    expect(isOwnedBusinessKey("user-1", "businesses/user-2/abc.png")).toBe(false)
    expect(isOwnedBusinessKey("user-1", "posts/user-1/abc.png")).toBe(false)
    expect(isOwnedBusinessKey("user-1", "../businesses/user-1/abc.png")).toBe(false)
  })
})
