import { env } from "@/config/env"

/**
 * Roles that grant access to the admin console. Finer-grained RBAC
 * (Sub-Admin / Moderator / Editor per-module rights) is future scope —
 * for now these roles all open the console.
 *
 * Kept dependency-free (config only) so it can be imported from the Auth.js
 * callbacks without creating a circular import via `@/lib/auth`.
 */
export const ADMIN_ROLES = ["admin", "super_admin"] as const

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
