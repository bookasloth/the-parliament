import { describe, it, expect } from "vitest"
import { gameIdSchema, isActiveSchema } from "@/app/admin/games/schema"

describe("admin games action schemas", () => {
  it("parses a valid uuid and boolean", () => {
    expect(gameIdSchema.parse("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3301")
    expect(isActiveSchema.parse(true)).toBe(true)
    expect(isActiveSchema.parse(false)).toBe(false)
  })

  it("rejects a non-uuid id", () => {
    expect(() => gameIdSchema.parse("not-a-uuid")).toThrow()
    expect(() => gameIdSchema.parse("")).toThrow()
  })

  it("rejects a non-boolean isActive", () => {
    expect(() => isActiveSchema.parse("true")).toThrow()
    expect(() => isActiveSchema.parse(1)).toThrow()
  })
})
