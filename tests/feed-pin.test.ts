import { describe, it, expect } from "vitest"
import { canPinFeed } from "@/modules/feed/pin"

describe("canPinFeed", () => {
  it("allows site admins", () => {
    expect(canPinFeed({ isAdmin: true })).toBe(true)
    expect(canPinFeed({ email: "someone@else.com", isAdmin: true })).toBe(true)
  })

  it("allows the owner account by email (case-insensitive)", () => {
    expect(canPinFeed({ email: "sndatarkar@gmail.com" })).toBe(true)
    expect(canPinFeed({ email: "SNDatarkar@Gmail.com" })).toBe(true)
  })

  it("denies everyone else", () => {
    expect(canPinFeed({ email: "random@user.com" })).toBe(false)
    expect(canPinFeed({ email: null })).toBe(false)
    expect(canPinFeed({})).toBe(false)
    expect(canPinFeed({ isAdmin: false })).toBe(false)
  })
})
