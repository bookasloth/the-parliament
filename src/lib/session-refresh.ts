/**
 * Decides whether the Auth.js jwt callback should re-query the user row this
 * request. The JWT strategy is meant to be DB-free; without this gate the
 * callback hit the DB on every request. Pure + exported so it's unit-tested
 * without booting NextAuth.
 */
export const REFRESH_TTL_SEC = 60

export function shouldRefreshToken(opts: {
  /** Auth.js jwt-callback trigger: "signIn" | "signUp" | "update" | undefined. */
  trigger?: string
  /** Present once the token has been enriched at least once. */
  membershipStatus?: string
  onboardingCompleted?: boolean
  /** Unix seconds of the last DB refresh (undefined on a legacy/first token). */
  refreshedAt?: number
  /** Unix seconds now. */
  now: number
  ttlSec?: number
}): boolean {
  const {
    trigger,
    membershipStatus,
    onboardingCompleted,
    refreshedAt = 0,
    now,
    ttlSec = REFRESH_TTL_SEC,
  } = opts
  return (
    // Sign-in / explicit session.update() always refresh.
    trigger === "signIn" ||
    trigger === "signUp" ||
    trigger === "update" ||
    // A token that was never enriched (no membershipStatus) must refresh.
    membershipStatus === undefined ||
    // Keep mid-onboarding users always-fresh so completion reflects instantly.
    onboardingCompleted === false ||
    // Otherwise reuse the token until it's older than the TTL.
    now - refreshedAt >= ttlSec
  )
}
