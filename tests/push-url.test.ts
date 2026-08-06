import { describe, it, expect } from "vitest"
import { pushUrlFor } from "@/modules/notifications/service"

describe("pushUrlFor", () => {
  it("post → feed permalink", () => {
    expect(pushUrlFor("post", "p1")).toBe("/feed/p1")
  })
  it("conversation → messages thread", () => {
    expect(pushUrlFor("conversation", "c1")).toBe("/messages/c1")
  })
  it("missing id → notifications inbox", () => {
    expect(pushUrlFor("post")).toBe("/notifications")
    expect(pushUrlFor("conversation", undefined)).toBe("/notifications")
  })
  it("unknown type → notifications inbox", () => {
    expect(pushUrlFor("reaction", "x")).toBe("/notifications")
    expect(pushUrlFor()).toBe("/notifications")
  })
})
