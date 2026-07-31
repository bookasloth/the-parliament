import { describe, it, expect } from "vitest"
import { validateRefundAmount } from "@/modules/membership/admin"

describe("validateRefundAmount", () => {
  it("accepts a positive amount up to the order total", () => {
    expect(validateRefundAmount(500, 1000)).toBeNull()
    expect(validateRefundAmount(1000, 1000)).toBeNull() // full refund
  })
  it("rejects zero, negative, and non-integer amounts", () => {
    expect(validateRefundAmount(0, 1000)).toMatch(/positive/)
    expect(validateRefundAmount(-1, 1000)).toMatch(/positive/)
    expect(validateRefundAmount(10.5, 1000)).toMatch(/positive/)
  })
  it("rejects an amount larger than what was charged", () => {
    expect(validateRefundAmount(1001, 1000)).toMatch(/exceeds/)
  })
})
