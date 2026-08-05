import { describe, it, expect } from "vitest"
import { editUserSchema } from "@/modules/admin/users"

const uuid = "aaaaaaaa-0000-4000-8000-000000000001"

describe("editUserSchema", () => {
  it("accepts a partial patch", () => {
    expect(editUserSchema.parse({ displayName: "Neha" })).toEqual({ displayName: "Neha" })
    expect(editUserSchema.parse({})).toEqual({})
  })

  it("allows null to clear displayName / house / batch", () => {
    const r = editUserSchema.parse({ displayName: null, houseId: null, batchId: null })
    expect(r.displayName).toBeNull()
    expect(r.houseId).toBeNull()
    expect(r.batchId).toBeNull()
  })

  it("rejects bad email", () => {
    expect(() => editUserSchema.parse({ email: "not-an-email" })).toThrow()
  })

  it("rejects empty legalName and unknown membership", () => {
    expect(() => editUserSchema.parse({ legalName: "" })).toThrow()
    expect(() => editUserSchema.parse({ membershipStatus: "vip" })).toThrow()
  })

  it("rejects non-uuid house/batch ids", () => {
    expect(() => editUserSchema.parse({ houseId: "123" })).toThrow()
  })

  it("accepts a full valid patch", () => {
    const r = editUserSchema.parse({
      legalName: "Neha Gupta", displayName: "Neha", email: "neha@x.com",
      membershipStatus: "premium", houseId: uuid, batchId: uuid,
    })
    expect(r.membershipStatus).toBe("premium")
  })
})
