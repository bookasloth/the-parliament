import { describe, it, expect } from "vitest"
import { createGroupSchema } from "@/modules/groups/request-schema"

describe("createGroupSchema", () => {
  it("accepts a valid group and trims fields", () => {
    const r = createGroupSchema.parse({ name: "  Mentorship Circle ", description: " Mentors ", visibility: "private" })
    expect(r).toEqual({ name: "Mentorship Circle", description: "Mentors", visibility: "private" })
  })

  it("normalises a blank or missing description to null", () => {
    expect(createGroupSchema.parse({ name: "Book Club", description: "   ", visibility: "public" }).description).toBeNull()
    expect(createGroupSchema.parse({ name: "Book Club", visibility: "public" }).description).toBeNull()
  })

  it("rejects a name under 3 chars after trim", () => {
    expect(createGroupSchema.safeParse({ name: "  ab ", visibility: "public" }).success).toBe(false)
  })

  it("rejects a name over 160 chars", () => {
    expect(createGroupSchema.safeParse({ name: "x".repeat(161), visibility: "public" }).success).toBe(false)
  })

  it("rejects a description over 2000 chars", () => {
    expect(createGroupSchema.safeParse({ name: "Book Club", description: "x".repeat(2001), visibility: "public" }).success).toBe(false)
  })

  it("rejects secret and unknown visibilities", () => {
    expect(createGroupSchema.safeParse({ name: "Book Club", visibility: "secret" }).success).toBe(false)
    expect(createGroupSchema.safeParse({ name: "Book Club", visibility: "open" }).success).toBe(false)
  })

  it("does not let callers set type or school (stripped)", () => {
    const r = createGroupSchema.parse({ name: "Book Club", visibility: "public", type: "batch", schoolId: "x" })
    expect(r).not.toHaveProperty("type")
    expect(r).not.toHaveProperty("schoolId")
  })
})
