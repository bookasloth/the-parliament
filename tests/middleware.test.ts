import { describe, it, expect } from "vitest"
import { isProtectedPath } from "@/middleware"

describe("isProtectedPath", () => {
  it("protects member-area prefixes and their subpaths", () => {
    for (const p of [
      "/feed",
      "/feed/post-123",
      "/community",
      "/groups",
      "/groups/batch-2010",
      "/business",
      "/business/new",
      "/membership",
      "/membership/checkout",
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

  it("leaves the two guest-viewable surfaces (+ marketing/auth) untouched", () => {
    for (const p of [
      "/",
      "/events", // public
      "/events/reunion", // public
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
    // "/eventsfoo" is not "/events"; but it also isn't a private prefix, so it's
    // public either way — assert the boundary doesn't accidentally protect it.
    expect(isProtectedPath("/feedback")).toBe(false) // not under "/feed"
  })
})
