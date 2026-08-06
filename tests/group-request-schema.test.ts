import { describe, it, expect } from "vitest"
import { groupRequestSchema } from "@/modules/groups/request-schema"

const uuid = "11111111-1111-4111-8111-111111111111"

describe("groupRequestSchema", () => {
  it("accepts a valid request", () => {
    const r = groupRequestSchema.safeParse({ groupId: uuid, category: "mentor", body: "Need guidance on UPSC" })
    expect(r.success).toBe(true)
  })

  it("rejects a non-uuid groupId", () => {
    expect(groupRequestSchema.safeParse({ groupId: "abc", category: "career", body: "hello there" }).success).toBe(false)
  })

  it("rejects an unknown category", () => {
    expect(groupRequestSchema.safeParse({ groupId: uuid, category: "food", body: "hello there" }).success).toBe(false)
  })

  it("rejects a body under 5 chars (after trim)", () => {
    expect(groupRequestSchema.safeParse({ groupId: uuid, category: "travel", body: "  hi " }).success).toBe(false)
  })

  it("rejects a body over 2000 chars", () => {
    expect(groupRequestSchema.safeParse({ groupId: uuid, category: "access", body: "x".repeat(2001) }).success).toBe(false)
  })
})
