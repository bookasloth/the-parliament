import { describe, it, expect } from "vitest";
import { computeIsAdmin, ADMIN_ROLES } from "@/modules/auth/admin";

// Single source of truth for "is this user an admin?" — shared by middleware,
// admin pages, server actions, and /api/admin routes (via gate.requireAdmin).

describe("computeIsAdmin", () => {
  it("grants on the isSuperAdmin flag alone (bootstrap admin, no role row)", () => {
    expect(computeIsAdmin({ isSuperAdmin: true })).toBe(true);
    expect(computeIsAdmin({ isSuperAdmin: true, roles: [], email: "x@y.z" })).toBe(true);
  });

  it("grants on any admin role", () => {
    expect(computeIsAdmin({ roles: ["admin"] })).toBe(true);
    expect(computeIsAdmin({ roles: ["super_admin"] })).toBe(true);
    expect(computeIsAdmin({ roles: ["founder"] })).toBe(true); // founder unified in (M3)
    expect(computeIsAdmin({ roles: ["member", "admin"] })).toBe(true);
  });

  it("founder is part of the shared admin-role set", () => {
    expect(ADMIN_ROLES).toContain("founder");
  });

  it("denies a non-admin with no flag, no admin role, no allowlisted email", () => {
    expect(computeIsAdmin({ roles: ["member"], email: "nobody@example.com" })).toBe(false);
    expect(computeIsAdmin({})).toBe(false);
    expect(computeIsAdmin({ isSuperAdmin: false, roles: [], email: null })).toBe(false);
    expect(computeIsAdmin({ roles: ["moderator", "editor"] })).toBe(false);
  });
});
