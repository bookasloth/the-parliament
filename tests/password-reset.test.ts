import { describe, it, expect } from "vitest"
import { generateCode } from "@/lib/password-reset"

describe("generateCode", () => {
  it("is 6 chars by default and honours a custom length", () => {
    expect(generateCode()).toHaveLength(6)
    expect(generateCode(8)).toHaveLength(8)
  })

  it("uses only unambiguous upper-case alphanumerics (no I/O/0/1)", () => {
    const allowed = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/
    for (let i = 0; i < 500; i++) {
      const c = generateCode()
      expect(c).toMatch(allowed)
      expect(c).not.toMatch(/[IO01]/)
    }
  })

  it("is effectively unique across many draws (no obvious bias)", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 1000; i++) seen.add(generateCode())
    // 32^6 space — 1000 draws should virtually never collide.
    expect(seen.size).toBeGreaterThan(995)
  })
})
