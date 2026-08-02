// Shared username rules — used by the profile-edit save action, the live
// availability endpoint, and unit tests. Keep this the single source of truth so
// the inline "username available" hint can never disagree with what save enforces.

export const RESERVED_USERNAMES = new Set([
  "feed", "directory", "community", "connections", "business", "businesses", "events",
  "groups", "membership", "notifications", "settings", "compose", "messages", "network",
  "profile", "admin", "auth", "api", "onboarding", "companies",
])

/** Normalise a raw username into its canonical slug (lowercase, hyphenated, ≤60). */
export function slugUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase()
    .replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
}

export type UsernameFormat =
  | { ok: true; slug: string }
  | { ok: false; slug: string; reason: string }

/** Pure, DB-free format check. Returns the canonical slug on success. */
export function validateUsernameFormat(raw: string): UsernameFormat {
  const slug = slugUsername(raw)
  if (!slug) return { ok: false, slug, reason: "Username is required" }
  if (slug.length < 3) return { ok: false, slug, reason: "Too short (min 3 characters)" }
  if (RESERVED_USERNAMES.has(slug)) return { ok: false, slug, reason: "That username is reserved" }
  return { ok: true, slug }
}
