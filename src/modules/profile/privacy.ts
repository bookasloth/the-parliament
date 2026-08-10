// Profile privacy policy — the single source of truth for "who sees what" on a
// /[username] profile. Pure + framework-free so it's unit-tested in isolation;
// loadProfile() calls it and both enforces the whole-profile gate and redacts
// fields server-side (sensitive bytes never reach an unauthorized viewer).
//
// Two axes:
//   1. Whole-profile gate  (Profile.visibility) → blocked?
//   2. Field-level scope    → which fields survive redaction.

export type ProfileVisibility = "public" | "alumni" | "connections" | "private"

/** The four visibility values, in display order (most → least open). */
export const PROFILE_VISIBILITIES: readonly ProfileVisibility[] = [
  "public",
  "alumni",
  "connections",
  "private",
] as const

/** Trust-boundary guard for user-submitted visibility (settings form). */
export function isProfileVisibility(v: unknown): v is ProfileVisibility {
  return typeof v === "string" && (PROFILE_VISIBILITIES as readonly string[]).includes(v)
}
export type ProfileScope = "owner" | "member" | "public"
/** Non-null → render the restricted stub instead of the full profile. */
export type BlockReason = "private" | "connections" | "alumni-guest"

export interface PrivacyInput {
  isOwner: boolean
  isLoggedIn: boolean
  /** viewer follows the profile, or the profile follows the viewer. Only
   *  consulted for `connections` visibility. */
  isConnected: boolean
  visibility: ProfileVisibility
  /** Owner opt-in (Profile.contactAlwaysShare) — unlocks contact fields to
   *  fellow logged-in members. */
  contactAlwaysShare: boolean
}

export interface PrivacyDecision {
  blocked: BlockReason | null
  scope: ProfileScope
  /** city, homeTown, gender, currentStatus */
  canSeeMemberFields: boolean
  /** correspondenceAddress */
  canSeeContact: boolean
  // Owner-only-hard fields (dateOfBirth, bloodGroup) === isOwner; not a flag.
}

export function resolveProfilePrivacy(i: PrivacyInput): PrivacyDecision {
  // Owner sees everything, always.
  if (i.isOwner) {
    return { blocked: null, scope: "owner", canSeeMemberFields: true, canSeeContact: true }
  }

  // Axis 1 — whole-profile gate. `public` never blocks; `alumni` (default)
  // blocks only logged-out visitors; `connections` needs a connection;
  // `private` blocks everyone but the owner.
  let blocked: BlockReason | null = null
  if (i.visibility === "private") blocked = "private"
  else if (i.visibility === "connections" && !i.isConnected) blocked = "connections"
  else if (i.visibility === "alumni" && !i.isLoggedIn) blocked = "alumni-guest"

  // Axis 2 — field scope (used when not blocked).
  const scope: ProfileScope = i.isLoggedIn ? "member" : "public"
  const canSeeMemberFields = i.isLoggedIn
  const canSeeContact = i.contactAlwaysShare && i.isLoggedIn

  return { blocked, scope, canSeeMemberFields, canSeeContact }
}
