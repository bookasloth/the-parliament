import { describe, it, expect } from "vitest"
import { canSignIn, canAct, blockedReason } from "@/lib/account-status"

describe("account-status", () => {
  it("active can sign in and act", () => {
    expect(canSignIn("active")).toBe(true)
    expect(canAct("active")).toBe(true)
    expect(blockedReason("active")).toBeNull()
  })

  it("suspended and banned cannot sign in or act", () => {
    for (const s of ["suspended", "banned"]) {
      expect(canSignIn(s)).toBe(false)
      expect(canAct(s)).toBe(false)
      expect(blockedReason(s)).toBeTruthy()
    }
  })

  it("inactive may sign in (for reactivation) but cannot act", () => {
    expect(canSignIn("inactive")).toBe(true)
    expect(canAct("inactive")).toBe(false)
    expect(blockedReason("inactive")).toBeTruthy()
  })

  it("defaults an unknown/missing status to active (fail-open on read)", () => {
    expect(canSignIn(undefined)).toBe(true)
    expect(canSignIn(null)).toBe(true)
    expect(canAct(undefined)).toBe(true)
    expect(blockedReason(undefined)).toBeNull()
  })
})
