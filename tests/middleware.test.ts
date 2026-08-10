import { describe, it, expect } from "vitest"
import { isProtectedPath } from "@/middleware"

describe("isProtectedPath", () => {
  it("protects member-area prefixes and their subpaths", () => {
    for (const p of [
      "/settings",
      "/settings/danger",
      "/connections",
      "/notifications",
      "/messages",
      "/messages/abc-123",
      "/compose",
      "/compose/drafts",
      "/saved",
      "/network",
      "/network/chapters/nagpur",
      "/profile/edit",
      "/business/new",
      "/ama",
      "/ama/xyz",
      "/games",
      "/games/alfazy/play",
      "/upgrade/premium",
      "/membership/checkout",
      "/dashboard",
      "/onboarding",
      "/onboarding/profile",
    ]) {
      expect(isProtectedPath(p), p).toBe(true)
    }
  })

  it("leaves public pages untouched", () => {
    for (const p of [
      "/",
      "/feed",
      "/feed/post-123",
      "/events",
      "/events/reunion",
      "/groups",
      "/business", // public directory
      "/membership", // public pricing (only /membership/checkout is private)
      "/someusername", // public profile at /[username]
      "/auth/signin",
      "/auth/signup",
      "/about",
      "/admin", // gated by requireAdmin, deliberately not here
    ]) {
      expect(isProtectedPath(p), p).toBe(false)
    }
  })

  it("does not match on prefix-substring boundaries", () => {
    // "/networkfoo" must NOT be treated as under "/network".
    expect(isProtectedPath("/networkfoo")).toBe(false)
    expect(isProtectedPath("/amazing")).toBe(false)
    expect(isProtectedPath("/settingsx")).toBe(false)
    expect(isProtectedPath("/membership")).toBe(false)
  })
})
