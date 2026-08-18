import { describe, it, expect } from "vitest"
import { reachableRecipients, type MemberContact } from "@/modules/whatsapp/service"

const m = (over: Partial<MemberContact>): MemberContact => ({
  userId: over.userId ?? "u1",
  name: over.name ?? "Member",
  phone: "phone" in over ? over.phone ?? null : "+919876543210",
  whatsappOptIn: over.whatsappOptIn ?? true,
  status: over.status ?? "active",
})

describe("reachableRecipients", () => {
  it("keeps active, opted-in members with a valid number", () => {
    const out = reachableRecipients([m({ userId: "a", name: "Asha", phone: "+919876543210" })])
    expect(out).toEqual([{ userId: "a", name: "Asha", destination: "919876543210" }])
  })

  it("drops opted-out members", () => {
    expect(reachableRecipients([m({ whatsappOptIn: false })])).toEqual([])
  })

  it("drops non-active members (suspended/deleted)", () => {
    expect(reachableRecipients([m({ status: "suspended" })])).toEqual([])
  })

  it("drops members with no / invalid phone", () => {
    expect(reachableRecipients([m({ phone: null }), m({ phone: "123" })])).toEqual([])
  })

  it("dedupes by normalized destination", () => {
    const out = reachableRecipients([
      m({ userId: "a", phone: "+919876543210" }),
      m({ userId: "b", phone: "9876543210" }), // same number, bare
    ])
    expect(out).toHaveLength(1)
    expect(out[0].userId).toBe("a")
  })

  it("filters a mixed batch down to only reachable ones", () => {
    const out = reachableRecipients([
      m({ userId: "ok", phone: "+919000000001" }),
      m({ userId: "optout", whatsappOptIn: false }),
      m({ userId: "nophone", phone: null }),
      m({ userId: "inactive", status: "deleted" }),
    ])
    expect(out.map((r) => r.userId)).toEqual(["ok"])
  })
})
