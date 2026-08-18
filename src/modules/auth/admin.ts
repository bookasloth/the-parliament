import { env } from "@/config/env"

/**
 * Roles that count as a FULL admin — the strict `requireAdmin`/`isAdmin` gate
 * used by every admin API route and `session.user.isAdmin`. Deliberately narrow:
 * broadening this would silently open every requireAdmin-gated route to lower
 * roles. `founder` is a legacy super-admin alias.
 *
 * Lower back-office roles (moderator/support/analyst) do NOT get full admin;
 * they reach the console via `canEnterConsole` (src/modules/admin/permissions)
 * and are then limited per-action by the `can()` matrix on each surface.
 *
 * Kept dependency-free (config only) so it can be imported from the Auth.js
 * callbacks without creating a circular import via `@/lib/auth`.
 */
export const ADMIN_ROLES = ["admin", "super_admin", "founder"] as const

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return env.adminEmails.includes(email.toLowerCase())
}

/**
 * Single source of truth for "is this user an admin?".
 * Admin if: the `isSuperAdmin` flag is set, OR they hold an admin role,
 * OR their email is in the ADMIN_EMAILS bootstrap allowlist.
 */
export function computeIsAdmin(opts: {
  email?: string | null
  isSuperAdmin?: boolean | null
  roles?: string[] | null
}): boolean {
  if (opts.isSuperAdmin) return true
  if (isAdminEmail(opts.email)) return true
  return (opts.roles ?? []).some((r) => (ADMIN_ROLES as readonly string[]).includes(r))
}
