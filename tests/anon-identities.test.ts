import { describe, it, expect } from "vitest"
import { anonIdentity, ANON_NAMES, ANON_ICONS, ANON_COLORS } from "@/config/anon-identities"

describe("anonIdentity", () => {
  it("is deterministic per post id (stable render)", () => {
    expect(anonIdentity("post-abc")).toEqual(anonIdentity("post-abc"))
  })

  it("always resolves into the pools", () => {
    for (let i = 0; i < 200; i++) {
      const id = anonIdentity(`p-${i}-${Math.random()}`)
      expect(ANON_NAMES).toContain(id.name)
      expect(ANON_ICONS).toContain(id.icon)
      expect(ANON_COLORS).toContain(id.color)
    }
  })

  it("spreads across the pool (not one constant) and different posts differ", () => {
    const names = new Set(Array.from({ length: 300 }, (_, i) => anonIdentity(`post-${i}`).name))
    expect(names.size).toBeGreaterThan(10) // clearly varied, not a single hardcoded name
  })

  it("has exactly 50 names and no duplicates", () => {
    expect(ANON_NAMES).toHaveLength(50)
    expect(new Set(ANON_NAMES).size).toBe(50)
  })
})
