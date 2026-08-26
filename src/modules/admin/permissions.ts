import { isAdminEmail } from "@/modules/auth/admin"

/**
 * RBAC permission matrix — the SINGLE source of truth for "may this admin do X".
 * Never compare role strings inline in a component/action; call `can()`.
 *
 * Console *entry* (may they reach /admin at all) is decided by `computeIsAdmin`
 * (src/modules/auth/admin.ts). This matrix decides per-action rights ONCE they
 * are in. The two are intentionally separate layers.
 */

export const ADMIN_ROLE_VALUES = [
  "super_admin",
  "admin",
  "moderator",
  "support",
  "analyst",
] as const
export type AdminRole = (typeof ADMIN_ROLE_VALUES)[number]

export type Permission =
  | "members:read"
  | "members:edit"
  | "members:moderate" // verify/reject, suspend, ban/unban, warn
  | "members:reset" // force password reset / reset verification state
  | "members:impersonate"
  | "members:hard_delete"
  | "content:read"
  | "content:moderate"
  | "reports:read"
  | "reports:resolve"
  | "verification:read"
  | "verification:review"
  | "groups:manage"
  | "events:manage"
  | "membership:manage" // grant/extend/revoke/refund paid memberships, set tiers
  | "announcements:send"
  | "whatsapp:send"
  | "cms:manage"
  | "analytics:read"
  | "audit:read"
  | "settings:manage"
  | "admins:manage"

/** Per-role grants. `"*"` = every permission (super_admin only). */
const MATRIX: Record<AdminRole, readonly Permission[] | "*"> = {
  super_admin: "*",
  admin: [
    "members:read",
    "members:edit",
    "members:moderate",
    "members:reset",
    "content:read",
    "content:moderate",
    "reports:read",
    "reports:resolve",
    "verification:read",
    "verification:review",
    "groups:manage",
    "events:manage",
    "membership:manage",
    "announcements:send",
    "whatsapp:send",
    "cms:manage",
    "analytics:read",
    "audit:read",
    // NOT: members:impersonate, members:hard_delete, settings:manage, admins:manage
  ],
  moderator: [
    "members:read",
    "members:moderate",
    "content:read",
    "content:moderate",
    "reports:read",
    "reports:resolve",
    "verification:read",
  ],
  support: [
    "members:read",
    "members:reset",
    "content:read",
    "reports:read",
    "verification:read",
    "analytics:read",
  ],
  analyst: ["analytics:read"],
}

export interface AdminPrincipal {
  email?: string | null
  isSuperAdmin?: boolean | null
  roles?: string[] | null
}

/**
 * Effective admin roles for a principal. The bootstrap super-admin (isSuperAdmin
 * flag, the ADMIN_EMAILS allowlist, or a legacy `founder` role) is elevated to
 * `super_admin` so it retains full rights without an explicit role row.
 */
export function effectiveAdminRoles(user: AdminPrincipal): AdminRole[] {
  const raw = new Set(user.roles ?? [])
  const roles = new Set<AdminRole>()
  for (const r of ADMIN_ROLE_VALUES) if (raw.has(r)) roles.add(r)
  if (user.isSuperAdmin || raw.has("founder") || isAdminEmail(user.email)) {
    roles.add("super_admin")
  }
  return [...roles]
}

/** True if the principal is allowed to perform `perm`. */
export function can(user: AdminPrincipal, perm: Permission): boolean {
  const roles = effectiveAdminRoles(user)
  if (roles.includes("super_admin")) return true
  return roles.some((r) => {
    const grants = MATRIX[r]
    return grants === "*" || grants.includes(perm)
  })
}

/**
 * May this principal *see* the admin console at all? Full admins, plus any lower
 * back-office role. This is only the entry check for the layout — every surface
 * inside still enforces `can()` per action.
 */
export function canEnterConsole(user: AdminPrincipal): boolean {
  return effectiveAdminRoles(user).length > 0
}
