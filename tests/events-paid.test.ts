import { describe, it, expect } from "vitest"
import { rupeesToPaise, createEventSchema } from "@/app/(main)/events/create-schema"
import { checkCapturedPayment } from "@/modules/membership/payment-guard"

describe("rupeesToPaise", () => {
  it("converts whole rupees to paise", () => {
    expect(rupeesToPaise(100)).toBe(10000)
    expect(rupeesToPaise(1)).toBe(100)
  })
  it("treats undefined/0/negative/NaN as free", () => {
    expect(rupeesToPaise(undefined)).toBe(0)
    expect(rupeesToPaise(0)).toBe(0)
    expect(rupeesToPaise(-50)).toBe(0)
    expect(rupeesToPaise(NaN)).toBe(0)
  })
  it("rounds fractional rupees", () => {
    expect(rupeesToPaise(10.4)).toBe(1000)
    expect(rupeesToPaise(10.6)).toBe(1100)
  })
})

describe("createEventSchema price", () => {
  const base = { title: "Reunion", date: "2026-10-18", time: "18:00", mode: "in-person" as const }
  it("accepts a valid price and omitted price", () => {
    expect(createEventSchema.safeParse({ ...base, priceRupees: 500 }).success).toBe(true)
    expect(createEventSchema.safeParse(base).success).toBe(true)
  })
  it("rejects negative or oversized price", () => {
    expect(createEventSchema.safeParse({ ...base, priceRupees: -1 }).success).toBe(false)
    expect(createEventSchema.safeParse({ ...base, priceRupees: 200000 }).success).toBe(false)
  })
})

describe("checkCapturedPayment (event orders reuse it)", () => {
  const order = { amountPaise: 50000, razorpayOrderId: "order_x" }
  it("passes a captured, correct-amount, matching-order payment", () => {
    expect(checkCapturedPayment({ status: "captured", amount: 50000, order_id: "order_x" }, order)).toEqual({ ok: true })
  })
  it("rejects wrong amount / uncaptured / mismatched order", () => {
    expect(checkCapturedPayment({ status: "authorized", amount: 50000, order_id: "order_x" }, order).ok).toBe(false)
    expect(checkCapturedPayment({ status: "captured", amount: 40000, order_id: "order_x" }, order).ok).toBe(false)
    expect(checkCapturedPayment({ status: "captured", amount: 50000, order_id: "other" }, order).ok).toBe(false)
  })
})
