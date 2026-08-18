import { describe, it, expect } from "vitest"
import { broadcastSchema } from "@/app/admin/notifications/schema"

describe("broadcastSchema", () => {
  it("parses valid input", () => {
    const r = broadcastSchema.parse({ title: "Hello", body: "World", type: "news" })
    expect(r).toEqual({ title: "Hello", body: "World", type: "news" })
  })

  it("throws on empty title", () => {
    expect(() => broadcastSchema.parse({ title: "" })).toThrow()
  })

  it("throws on title over 200 chars", () => {
    expect(() => broadcastSchema.parse({ title: "x".repeat(201) })).toThrow()
  })

  it("defaults type to announcement when omitted", () => {
    expect(broadcastSchema.parse({ title: "Hi" }).type).toBe("announcement")
  })

  it("allows omitting body", () => {
    expect(broadcastSchema.parse({ title: "Hi" }).body).toBeUndefined()
  })
})
