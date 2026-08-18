import { enforceRateLimit } from "@/lib/rate-limit"

/**
 * Per-admin rate limit on a mutating admin action. Buckets are generous — they
 * exist to blunt a runaway loop or a compromised/hijacked admin session, not to
 * throttle normal back-office work. Throws RateLimitedError (→ 429 in API routes
 * via handleError; surfaced as an error toast in server actions).
 *
 * Keyed per actor, so one admin hitting a limit never blocks another.
 */
export function enforceAdminRateLimit(
  actorId: string,
  bucket: string,
  limit = 60,
  windowSec = 60,
): Promise<void> {
  return enforceRateLimit({ bucket: `admin:${bucket}`, identifier: actorId, limit, windowSec })
}
