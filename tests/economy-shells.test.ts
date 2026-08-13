import { describe, it, expect } from "vitest"
import { shellsForMembership, maxShellSpend, SHELL_PACKS, STREAK_RESTORE_COST } from "@/modules/economy/shells"

// shell-discount uses DB so we test the pure helpers it depends on here

describe("shellsForMembership", () => {
  it("₹999 → 9 shells", () => expect(shellsForMembership(999)).toBe(9))
  it("₹499 → 4 shells", () => expect(shellsForMembership(499)).toBe(4))
  it("₹1000 → 10 shells", () => expect(shellsForMembership(1000)).toBe(10))
  it("₹99 → 0 shells", () => expect(shellsForMembership(99)).toBe(0))
})

describe("maxShellSpend", () => {
  it("50 balance → max 5 per purchase", () => expect(maxShellSpend(50)).toBe(5))
  it("10 balance → max 1", () => expect(maxShellSpend(10)).toBe(1))
  it("9 balance → max 0", () => expect(maxShellSpend(9)).toBe(0))
  it("0 balance → 0", () => expect(maxShellSpend(0)).toBe(0))
  it("2400 balance → 240", () => expect(maxShellSpend(2400)).toBe(240))
})

describe("shell packs", () => {
  it("has 5 tiers", () => expect(SHELL_PACKS).toHaveLength(5))
  it("paise = INR × 100", () => {
    for (const p of SHELL_PACKS) {
      expect(p.pricePaise).toBe(p.priceInr * 100)
    }
  })
  it("shells = base + bonus", () => {
    expect(SHELL_PACKS[0].shells).toBe(100) // no bonus
    expect(SHELL_PACKS[1].shells).toBe(265) // 250 + 15
    expect(SHELL_PACKS[4].shells).toBe(2400) // 2000 + 400
  })
  it("effective price per shell decreases with bigger packs", () => {
    const rates = SHELL_PACKS.map((p) => p.priceInr / p.shells)
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThan(rates[i - 1])
    }
  })
})

describe("streak restore", () => {
  it("costs 2 shells", () => expect(STREAK_RESTORE_COST).toBe(2))
})
