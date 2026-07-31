// Pure helpers for the settings actions — kept out of the "use server" file
// (which may only export async functions) so they're importable + unit-testable.

// The user-toggleable email categories. `transactional` (account/security) is
// intentionally absent — it's unblockable and always stays on.
export const EMAIL_PREF_KEYS = [
  "lifecycle",
  "reminders",
  "wishes",
  "festivalGreetings",
  "engagement",
  "digests",
  "marketing",
] as const

export type EmailPrefKey = (typeof EMAIL_PREF_KEYS)[number]

export const EMAIL_PREF_LABELS: Record<EmailPrefKey, string> = {
  lifecycle: "Membership & account updates",
  reminders: "Renewal reminders",
  wishes: "Birthday wishes",
  festivalGreetings: "Festival greetings",
  engagement: "Post activity — comments, reactions, mentions",
  digests: "Weekly & monthly digests",
  marketing: "Announcements & offers",
}

/** Coerce arbitrary form input to the exact set of pref flags. Unknown keys are
 *  dropped; missing keys default to false; transactional is forced on. */
export function sanitizeEmailPrefs(
  input: Record<string, unknown>,
): Record<EmailPrefKey, boolean> & { transactional: true } {
  const out = { transactional: true } as Record<EmailPrefKey, boolean> & { transactional: true }
  for (const k of EMAIL_PREF_KEYS) out[k] = input[k] === true
  return out
}

/** Validate a new password. Returns an error message, or null if it's fine. */
export function validateNewPassword(next: string, confirm: string): string | null {
  if (next.length < 8) return "Password must be at least 8 characters."
  if (next.length > 200) return "Password is too long."
  if (next !== confirm) return "Passwords don't match."
  return null
}
