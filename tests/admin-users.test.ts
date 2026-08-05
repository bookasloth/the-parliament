import { describe, it, expect } from "vitest"
import { isSelfForbidden, USER_ACTIONS } from "@/modules/admin/users"

describe("isSelfForbidden", () => {
  const me = "aaaaaaaa-0000-0000-0000-000000000001"
  const other = "bbbbbbbb-0000-0000-0000-000000000002"

  it("blocks destructive self-actions", () => {
    for (const a of ["suspend", "ban", "delete", "remove-role"] as const) {
      expect(isSelfForbidden(a, me, me)).toBe(true)
    }
  })

  it("allows harmless self-actions", () => {
    for (const a of ["verify", "unverify", "activate", "reset-password", "set-role"] as const) {
      expect(isSelfForbidden(a, me, me)).toBe(false)
    }
  })

  it("never blocks actions on other users", () => {
    for (const a of USER_ACTIONS) {
      expect(isSelfForbidden(a, me, other)).toBe(false)
    }
  })
})
