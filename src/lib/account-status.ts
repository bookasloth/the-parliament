// Single source of truth for "what may an account in this status do". Pure +
// framework-free so both the Auth.js layer (sign-in) and the session guards
// (every gated action) enforce the SAME rule, and it's unit-tested in isolation.
//
// Statuses (UserStatus enum): active | inactive | suspended | banned.
//   - active     → full access.
//   - inactive   → self-closed. Blocked from acting, but may still sign in so a
//                  reactivation flow can bring them back (P0-9 grace window).
//   - suspended  → moderator time-out. Cannot sign in, cannot act.
//   - banned     → permanent. Cannot sign in, cannot act.

export type AccountStatus = "active" | "inactive" | "suspended" | "banned"

/** Statuses a moderator applies — hard-blocked from BOTH sign-in and actions. */
const HARD_BLOCKED: ReadonlySet<string> = new Set(["suspended", "banned"])

/** True if the account may obtain a session (sign in). */
export function canSignIn(status: string | null | undefined): boolean {
  return !HARD_BLOCKED.has(status ?? "active")
}

/** True if the account may perform a gated action (post, comment, follow, DM…). */
export function canAct(status: string | null | undefined): boolean {
  return (status ?? "active") === "active"
}

/** Human-facing reason an account can't act, or null when it can. */
export function blockedReason(status: string | null | undefined): string | null {
  const s = status ?? "active"
  if (s === "suspended") return "Your account is suspended."
  if (s === "banned") return "Your account has been banned."
  if (s === "inactive") return "Your account is deactivated. Reactivate it to continue."
  return null
}
