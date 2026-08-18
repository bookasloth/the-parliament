import { describe, it, expect } from "vitest"
import { GUIDES, guideForPath } from "@/app/admin/help/guides"

describe("guideForPath", () => {
  it("matches a guide whose href is an exact path", () => {
    expect(guideForPath("/admin/verification")?.slug).toBe("verify-member")
  })

  it("matches on a deeper sub-path (href is a prefix)", () => {
    expect(guideForPath("/admin/verification/abc123")?.slug).toBe("verify-member")
  })

  it("picks the longest-prefix href when several could match", () => {
    // /admin/audit-logs must not be swallowed by a shorter href like /admin.
    expect(guideForPath("/admin/audit-logs")?.slug).toBe("read-audit-log")
  })

  it("returns undefined for a path no guide documents", () => {
    expect(guideForPath("/admin/nowhere")).toBeUndefined()
  })

  it("does not match on a partial segment (prefix must be a path boundary)", () => {
    // /admin/users-export is not under /admin/users.
    expect(guideForPath("/admin/users-export")).toBeUndefined()
  })

  it("every guide with an href resolves to itself or a more specific sibling", () => {
    for (const g of GUIDES) {
      if (!g.href) continue
      const hit = guideForPath(g.href)
      expect(hit).toBeDefined()
      expect(hit!.href).toBe(g.href)
    }
  })
})
