import { describe, it, expect } from "vitest"
import { isValidRating } from "@/modules/events/service"

describe("isValidRating", () => {
  it("accepts integers 1..5", () => {
    for (const n of [1, 2, 3, 4, 5]) expect(isValidRating(n)).toBe(true)
  })
  it("rejects out-of-range, zero, negative", () => {
    for (const n of [0, -1, 6, 100]) expect(isValidRating(n)).toBe(false)
  })
  it("rejects non-integers and NaN", () => {
    for (const n of [1.5, 3.0001, NaN, Infinity]) expect(isValidRating(n)).toBe(false)
  })
})
