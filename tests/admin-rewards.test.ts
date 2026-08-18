import { describe, it, expect } from "vitest"
import { redemptionStatusSchema, idSchema } from "@/app/admin/rewards/schemas"

describe("admin rewards schemas", () => {
  it("parses every valid redemption status", () => {
    for (const s of ["fulfilled", "pending", "refunded", "cancelled"]) {
      expect(redemptionStatusSchema.parse(s)).toBe(s)
    }
  })

  it("rejects an invalid status", () => {
    expect(() => redemptionStatusSchema.parse("shipped")).toThrow()
  })

  it("accepts a uuid id and rejects a non-uuid", () => {
    expect(idSchema.parse("123e4567-e89b-42d3-a456-426614174000")).toBeTruthy()
    expect(() => idSchema.parse("not-a-uuid")).toThrow()
  })
})
