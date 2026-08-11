import { describe, it, expect } from "vitest"
import { verifiedSealColor, VERIFIED_SEAL_COLORS, DEFAULT_SEAL_COLOR } from "@/config/membership-colors"

describe("verifiedSealColor", () => {
  it("returns the tier colour for a known tier", () => {
    expect(verifiedSealColor("life")).toBe(VERIFIED_SEAL_COLORS.life)
    expect(verifiedSealColor("student")).toBe(VERIFIED_SEAL_COLORS.student)
  })

  it("life is the gold used by the feed badge (consistency across surfaces)", () => {
    expect(verifiedSealColor("life")).toBe("#E0A400")
  })

  it("falls back to brand blue for unknown / missing tiers", () => {
    expect(verifiedSealColor(undefined)).toBe(DEFAULT_SEAL_COLOR)
    expect(verifiedSealColor(null)).toBe(DEFAULT_SEAL_COLOR)
    expect(verifiedSealColor("")).toBe(DEFAULT_SEAL_COLOR)
    expect(verifiedSealColor("nonsense")).toBe(DEFAULT_SEAL_COLOR)
  })
})
