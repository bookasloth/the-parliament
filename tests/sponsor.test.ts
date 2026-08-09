import { describe, it, expect } from "vitest"
import {
  validateSponsorAmount,
  validateContribution,
  deriveTier,
  tierById,
  SPONSOR_TIERS,
} from "@/config/sponsor"

describe("validateSponsorAmount", () => {
  it("rejects an unknown tier", () => {
    expect(validateSponsorAmount("bronze", 100_00)).toMatchObject({ ok: false })
  })

  it("rejects non-positive or non-integer amounts", () => {
    expect(validateSponsorAmount("silver", 0)).toMatchObject({ ok: false })
    expect(validateSponsorAmount("silver", -500)).toMatchObject({ ok: false })
    expect(validateSponsorAmount("silver", 100.5)).toMatchObject({ ok: false })
  })

  it("enforces each tier minimum at the boundary", () => {
    for (const t of SPONSOR_TIERS) {
      expect(validateSponsorAmount(t.id, t.minPaise - 1)).toMatchObject({ ok: false })
      expect(validateSponsorAmount(t.id, t.minPaise)).toMatchObject({ ok: true })
    }
  })

  it("keeps the documented minimums (silver ₹100, gold ₹500, platinum ₹2,500)", () => {
    expect(tierById("silver")!.minPaise).toBe(10_000)
    expect(tierById("gold")!.minPaise).toBe(50_000)
    expect(tierById("platinum")!.minPaise).toBe(250_000)
  })

  it("rejects amounts over the ₹1,00,000 cap", () => {
    expect(validateSponsorAmount("platinum", 100_000_00 + 1)).toMatchObject({ ok: false })
    expect(validateSponsorAmount("platinum", 100_000_00)).toMatchObject({ ok: true })
  })
})

describe("deriveTier", () => {
  it("companies are always platinum", () => {
    expect(deriveTier("company", 10_000)).toBe("platinum")
    expect(deriveTier("company", 5_000_00)).toBe("platinum")
  })
  it("individuals: gold at/above ₹500, else silver", () => {
    expect(deriveTier("individual", 49_999)).toBe("silver")
    expect(deriveTier("individual", 50_000)).toBe("gold")
    expect(deriveTier("individual", 10_000)).toBe("silver")
  })
})

describe("validateContribution", () => {
  it("rejects unknown kind and bad amounts", () => {
    expect(validateContribution("angel", 50_000)).toMatchObject({ ok: false })
    expect(validateContribution("individual", 0)).toMatchObject({ ok: false })
    expect(validateContribution("individual", 100.5)).toMatchObject({ ok: false })
  })

  it("individuals floor at ₹100 (silver) and derive the right tier", () => {
    expect(validateContribution("individual", 9_999)).toMatchObject({ ok: false })
    expect(validateContribution("individual", 10_000)).toMatchObject({ ok: true, tier: "silver" })
    expect(validateContribution("individual", 50_000)).toMatchObject({ ok: true, tier: "gold" })
  })

  it("companies must clear the ₹2,500 platinum floor", () => {
    expect(validateContribution("company", 50_000)).toMatchObject({ ok: false })
    expect(validateContribution("company", 250_000)).toMatchObject({ ok: true, tier: "platinum" })
  })

  it("rejects over the cap", () => {
    expect(validateContribution("individual", 100_000_00 + 1)).toMatchObject({ ok: false })
    expect(validateContribution("individual", 100_000_00)).toMatchObject({ ok: true })
  })
})
