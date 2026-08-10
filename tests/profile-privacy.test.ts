import { describe, it, expect } from "vitest"
import { resolveProfilePrivacy, type PrivacyInput } from "@/modules/profile/privacy"

const base: PrivacyInput = {
  isOwner: false,
  isLoggedIn: true,
  isConnected: false,
  visibility: "alumni",
  contactAlwaysShare: false,
}

describe("resolveProfilePrivacy", () => {
  it("owner sees everything regardless of visibility", () => {
    for (const visibility of ["public", "alumni", "connections", "private"] as const) {
      const d = resolveProfilePrivacy({ ...base, isOwner: true, isLoggedIn: true, visibility })
      expect(d).toEqual({ blocked: null, scope: "owner", canSeeMemberFields: true, canSeeContact: true })
    }
  })

  it("private blocks every non-owner", () => {
    expect(resolveProfilePrivacy({ ...base, visibility: "private" }).blocked).toBe("private")
    expect(resolveProfilePrivacy({ ...base, visibility: "private", isLoggedIn: false }).blocked).toBe("private")
    expect(resolveProfilePrivacy({ ...base, visibility: "private", isConnected: true }).blocked).toBe("private")
  })

  it("connections blocks non-connections, allows connections", () => {
    expect(resolveProfilePrivacy({ ...base, visibility: "connections", isConnected: false }).blocked).toBe("connections")
    expect(resolveProfilePrivacy({ ...base, visibility: "connections", isConnected: true }).blocked).toBeNull()
  })

  it("alumni (default) blocks only logged-out visitors", () => {
    expect(resolveProfilePrivacy({ ...base, visibility: "alumni", isLoggedIn: false }).blocked).toBe("alumni-guest")
    expect(resolveProfilePrivacy({ ...base, visibility: "alumni", isLoggedIn: true }).blocked).toBeNull()
  })

  it("public never blocks — logged-out gets public scope, no member/contact fields", () => {
    const guest = resolveProfilePrivacy({ ...base, visibility: "public", isLoggedIn: false })
    expect(guest.blocked).toBeNull()
    expect(guest.scope).toBe("public")
    expect(guest.canSeeMemberFields).toBe(false)
    expect(guest.canSeeContact).toBe(false)
  })

  it("logged-in member sees member fields but not contact by default", () => {
    const d = resolveProfilePrivacy({ ...base, isLoggedIn: true })
    expect(d.scope).toBe("member")
    expect(d.canSeeMemberFields).toBe(true)
    expect(d.canSeeContact).toBe(false)
  })

  it("contactAlwaysShare unlocks contact to members, never to the public", () => {
    const member = resolveProfilePrivacy({ ...base, isLoggedIn: true, contactAlwaysShare: true })
    expect(member.canSeeContact).toBe(true)
    // A logged-out viewer on a public profile never gets contact even with the opt-in.
    const guest = resolveProfilePrivacy({ ...base, isLoggedIn: false, visibility: "public", contactAlwaysShare: true })
    expect(guest.canSeeContact).toBe(false)
  })
})
