import { describe, it, expect, beforeAll } from "vitest"
import { can, canEnterConsole, effectiveAdminRoles, type Permission } from "@/modules/admin/permissions"

beforeAll(() => {
  // isAdminEmail reads env.adminEmails; keep the allowlist empty & deterministic.
  process.env.ADMIN_EMAILS = ""
})

const r = (role: string) => ({ roles: [role] })

describe("effectiveAdminRoles", () => {
  it("elevates the isSuperAdmin flag to super_admin", () => {
    expect(effectiveAdminRoles({ isSuperAdmin: true })).toContain("super_admin")
  })
  it("treats legacy `founder` as super_admin", () => {
    expect(effectiveAdminRoles({ roles: ["founder"] })).toContain("super_admin")
  })
  it("drops unknown role strings", () => {
    expect(effectiveAdminRoles({ roles: ["wizard"] })).toEqual([])
  })
})

describe("can — super_admin", () => {
  it("allows everything", () => {
    const su = { isSuperAdmin: true }
    for (const p of ["members:hard_delete", "admins:manage", "settings:manage"] as Permission[]) {
      expect(can(su, p)).toBe(true)
    }
  })
})

describe("can — admin", () => {
  it("has operational rights", () => {
    expect(can(r("admin"), "members:moderate")).toBe(true)
    expect(can(r("admin"), "cms:manage")).toBe(true)
  })
  it("cannot manage admins, settings, impersonate, or hard-delete", () => {
    for (const p of [
      "admins:manage",
      "settings:manage",
      "members:impersonate",
      "members:hard_delete",
    ] as Permission[]) {
      expect(can(r("admin"), p)).toBe(false)
    }
  })
})

describe("can — membership:manage (financial: grant/refund/set-tier)", () => {
  it("admin and super_admin can manage memberships", () => {
    expect(can(r("admin"), "membership:manage")).toBe(true)
    expect(can({ isSuperAdmin: true }, "membership:manage")).toBe(true)
  })
  it("moderator, support, and analyst cannot", () => {
    expect(can(r("moderator"), "membership:manage")).toBe(false)
    expect(can(r("support"), "membership:manage")).toBe(false)
    expect(can(r("analyst"), "membership:manage")).toBe(false)
  })
})

describe("can — moderator", () => {
  it("moderates content/reports/members but no analytics or verification review", () => {
    expect(can(r("moderator"), "content:moderate")).toBe(true)
    expect(can(r("moderator"), "reports:resolve")).toBe(true)
    expect(can(r("moderator"), "members:moderate")).toBe(true)
    expect(can(r("moderator"), "analytics:read")).toBe(false)
    expect(can(r("moderator"), "members:hard_delete")).toBe(false)
  })
})

describe("can — support", () => {
  it("is read-only plus member reset; never moderates or deletes", () => {
    expect(can(r("support"), "members:read")).toBe(true)
    expect(can(r("support"), "members:reset")).toBe(true)
    expect(can(r("support"), "members:moderate")).toBe(false)
    expect(can(r("support"), "content:moderate")).toBe(false)
  })
})

describe("can — analyst", () => {
  it("sees analytics only", () => {
    expect(can(r("analyst"), "analytics:read")).toBe(true)
    expect(can(r("analyst"), "members:read")).toBe(false)
    expect(can(r("analyst"), "audit:read")).toBe(false)
  })
})

describe("can — no roles", () => {
  it("denies all", () => {
    expect(can({ roles: [] }, "analytics:read")).toBe(false)
    expect(can({}, "members:read")).toBe(false)
  })
})

describe("canEnterConsole", () => {
  it("lets any back-office role in", () => {
    for (const role of ["super_admin", "admin", "moderator", "support", "analyst"]) {
      expect(canEnterConsole({ roles: [role] })).toBe(true)
    }
    expect(canEnterConsole({ isSuperAdmin: true })).toBe(true)
  })
  it("keeps plain members out", () => {
    expect(canEnterConsole({ roles: [] })).toBe(false)
    expect(canEnterConsole({ roles: ["member"] })).toBe(false)
    expect(canEnterConsole({})).toBe(false)
  })
})
