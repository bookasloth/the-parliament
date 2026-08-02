import { describe, it, expect } from "vitest"
import { slugUsername, validateUsernameFormat, RESERVED_USERNAMES } from "@/lib/username-check"

describe("slugUsername", () => {
  it("lowercases, strips @, and hyphenates non-alphanumerics", () => {
    expect(slugUsername("@John Doe!")).toBe("john-doe")
    expect(slugUsername("  Mixed__Case  ")).toBe("mixed-case")
  })
  it("collapses runs of hyphens and trims edge hyphens", () => {
    expect(slugUsername("--a---b--")).toBe("a-b")
    expect(slugUsername("...ravi...")).toBe("ravi")
  })
  it("caps length at 60 characters", () => {
    expect(slugUsername("a".repeat(80))).toHaveLength(60)
  })
  it("returns empty string for all-punctuation input", () => {
    expect(slugUsername("!!!")).toBe("")
    expect(slugUsername("   ")).toBe("")
  })
})

describe("validateUsernameFormat", () => {
  it("accepts a normal username and returns its slug", () => {
    expect(validateUsernameFormat("Ravi Kumar")).toEqual({ ok: true, slug: "ravi-kumar" })
  })
  it("rejects empty / punctuation-only input", () => {
    expect(validateUsernameFormat("")).toMatchObject({ ok: false, reason: "Username is required" })
    expect(validateUsernameFormat("@@@")).toMatchObject({ ok: false, reason: "Username is required" })
  })
  it("rejects slugs shorter than 3 characters", () => {
    expect(validateUsernameFormat("ab")).toMatchObject({ ok: false, reason: "Too short (min 3 characters)" })
  })
  it("rejects reserved names", () => {
    for (const r of ["admin", "api", "profile", "community"]) {
      expect(RESERVED_USERNAMES.has(r)).toBe(true)
      expect(validateUsernameFormat(r)).toMatchObject({ ok: false, reason: "That username is reserved" })
    }
  })
  it("rejects a reserved name even with decorative characters", () => {
    expect(validateUsernameFormat("@Admin")).toMatchObject({ ok: false, reason: "That username is reserved" })
  })
})
