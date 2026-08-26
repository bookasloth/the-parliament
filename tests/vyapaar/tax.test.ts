import { describe, it, expect } from "vitest"
import { capitalGainsTax } from "@/modules/vyapaar/tax"

describe("capitalGainsTax", () => {
  it("charges nothing at or below the free allowance", () => {
    expect(capitalGainsTax(0)).toBe(0)
    expect(capitalGainsTax(2000)).toBe(0)
  })
  it("returns 0 for a loss (no negative tax)", () => {
    expect(capitalGainsTax(-5000)).toBe(0)
  })
  it("taxes only the amount inside each slab (progressive)", () => {
    expect(capitalGainsTax(10_000)).toBe(800) // (10000-2000)*0.10
    expect(capitalGainsTax(25_000)).toBe(3800) // 800 + (25000-10000)*0.20
    expect(capitalGainsTax(30_000)).toBe(5300) // 3800 + (30000-25000)*0.30
  })
  it("is monotonic — earning more never lowers take-home", () => {
    let prevNet = -Infinity
    for (const p of [0, 2000, 5000, 10_000, 20_000, 40_000]) {
      const net = p - capitalGainsTax(p)
      expect(net).toBeGreaterThanOrEqual(prevNet)
      prevNet = net
    }
  })
})
