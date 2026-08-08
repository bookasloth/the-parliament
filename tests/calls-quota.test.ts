import { describe, it, expect } from "vitest"
import {
  evaluateQuota,
  tierHasCalling,
  quotaMessage,
  packPaymentValid,
  TIER_CALL_LIMITS,
  STUDENT_PASS,
  type UsageByWindow,
} from "@/config/calls"

const zero: UsageByWindow = { day: 0, week: 0, month: 0 }

describe("evaluateQuota — student / inactive (no included calling)", () => {
  it("student needs a pass", () => {
    const d = evaluateQuota("student", zero)
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe("pass_required")
    expect(d.maxCallMinutes).toBe(0)
  })

  it("inactive is excluded outright", () => {
    const d = evaluateQuota("inactive", zero)
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe("tier_excluded")
  })
})

describe("evaluateQuota — included tiers", () => {
  it("fresh associate is capped at per-call, not the bigger windows", () => {
    const d = evaluateQuota("associate", zero)
    expect(d.allowed).toBe(true)
    expect(d.maxCallMinutes).toBe(TIER_CALL_LIMITS.associate!.perCallMin) // 30
  })

  it("caps the call to the smallest remaining window", () => {
    // associate: day 60. Already used 50 today → only 10 left, below per-call 30.
    const d = evaluateQuota("associate", { day: 50, week: 50, month: 50 })
    expect(d.allowed).toBe(true)
    expect(d.maxCallMinutes).toBe(10)
  })

  it("blocks when the day window is exhausted (boundary: spent == limit)", () => {
    const d = evaluateQuota("associate", { day: 60, week: 100, month: 100 })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe("day")
    expect(d.maxCallMinutes).toBe(0)
  })

  it("blocks on week even if day has room", () => {
    const d = evaluateQuota("associate", { day: 0, week: 240, month: 300 })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe("week")
  })

  it("blocks on month even if day and week have room", () => {
    const d = evaluateQuota("associate", { day: 0, week: 0, month: 600 })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe("month")
  })

  it("premium has a higher per-call cap than associate", () => {
    const d = evaluateQuota("premium", zero)
    expect(d.maxCallMinutes).toBe(60)
  })

  it("day check wins when multiple windows are simultaneously exhausted", () => {
    const d = evaluateQuota("associate", { day: 60, week: 240, month: 600 })
    expect(d.reason).toBe("day") // most-specific window reported first
  })
})

describe("tierHasCalling", () => {
  it("students/inactive excluded, paid tiers included", () => {
    expect(tierHasCalling("student")).toBe(false)
    expect(tierHasCalling("inactive")).toBe(false)
    expect(tierHasCalling("associate")).toBe(true)
    expect(tierHasCalling("premium")).toBe(true)
    expect(tierHasCalling("life")).toBe(true)
    expect(tierHasCalling("committee")).toBe(true)
  })
})

describe("packPaymentValid", () => {
  const paise = STUDENT_PASS.pricePaise
  it("accepts a captured payment for the exact price", () => {
    expect(packPaymentValid({ status: "captured", amount: paise })).toBe(true)
    expect(packPaymentValid({ status: "captured", amount: String(paise) })).toBe(true)
  })
  it("rejects authorized-but-not-captured", () => {
    expect(packPaymentValid({ status: "authorized", amount: paise })).toBe(false)
  })
  it("rejects a tampered (wrong) amount", () => {
    expect(packPaymentValid({ status: "captured", amount: 100 })).toBe(false)
    expect(packPaymentValid({ status: "captured", amount: paise - 1 })).toBe(false)
  })
})

describe("quotaMessage", () => {
  it("pass_required message names the price", () => {
    const msg = quotaMessage(evaluateQuota("student", zero))
    expect(msg).toContain(`₹${STUDENT_PASS.priceInr}`)
    expect(msg).toContain(`${STUDENT_PASS.minutes}`)
  })

  it("every reason yields a non-empty message", () => {
    for (const usage of [
      { day: 60, week: 100, month: 100 },
      { day: 0, week: 240, month: 300 },
      { day: 0, week: 0, month: 600 },
    ] as UsageByWindow[]) {
      expect(quotaMessage(evaluateQuota("associate", usage)).length).toBeGreaterThan(0)
    }
  })
})
