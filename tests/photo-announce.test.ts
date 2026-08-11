import { describe, it, expect } from "vitest"
import { shouldAnnouncePhotoChange } from "@/modules/feed/posts"

describe("shouldAnnouncePhotoChange", () => {
  it("announces a real change by an onboarded user", () => {
    expect(shouldAnnouncePhotoChange(true, true)).toBe(true)
  })

  it("skips the first-ever photo (no prior photo)", () => {
    expect(shouldAnnouncePhotoChange(false, true)).toBe(false)
  })

  it("skips users who haven't finished onboarding", () => {
    expect(shouldAnnouncePhotoChange(true, false)).toBe(false)
    expect(shouldAnnouncePhotoChange(false, false)).toBe(false)
  })
})
