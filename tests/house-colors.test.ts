import { describe, it, expect } from "vitest"
import { houseColor, HOUSE_COLORS } from "@/config/house-colors"

describe("houseColor", () => {
  it("maps known houses (case/space-insensitive)", () => {
    expect(houseColor("Aravali")).toBe("#5a9bd5")
    expect(houseColor("nilgiri")).toBe("#70ad47")
    expect(houseColor("  Shiwalik  ")).toBe("#e8503a")
    expect(houseColor("Shivalik")).toBe("#e8503a") // alt spelling
    expect(houseColor("UDAIGIRI")).toBe("#ffe135")
  })

  it("returns null for missing/unknown names", () => {
    expect(houseColor(null)).toBeNull()
    expect(houseColor(undefined)).toBeNull()
    expect(houseColor("")).toBeNull()
    expect(houseColor("Hogwarts")).toBeNull()
  })

  it("every colour is a valid hex", () => {
    for (const hex of Object.values(HOUSE_COLORS)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
