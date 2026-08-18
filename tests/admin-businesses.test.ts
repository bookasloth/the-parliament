import { describe, it, expect } from "vitest"
import { businessStatusSchema, businessIdSchema } from "@/app/admin/businesses/schema"

describe("business status schema", () => {
  it("accepts every valid status", () => {
    for (const s of ["approved", "rejected", "suspended", "pending"]) {
      expect(businessStatusSchema.parse(s)).toBe(s)
    }
  })

  it("rejects invalid statuses", () => {
    for (const s of ["active", "", "APPROVED"]) {
      expect(() => businessStatusSchema.parse(s)).toThrow()
    }
  })

  it("rejects a non-uuid id", () => {
    expect(() => businessIdSchema.parse("not-a-uuid")).toThrow()
    expect(businessIdSchema.parse("11111111-1111-4111-8111-111111111111")).toBeTruthy()
  })
})
