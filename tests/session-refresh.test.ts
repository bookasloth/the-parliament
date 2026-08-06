import { describe, it, expect } from "vitest"
import { shouldRefreshToken, REFRESH_TTL_SEC } from "@/lib/session-refresh"

const NOW = 1_000_000

// A steady-state token: enriched, onboarding done, refreshed just now.
const fresh = {
  trigger: undefined as string | undefined,
  membershipStatus: "premium",
  onboardingCompleted: true,
  refreshedAt: NOW,
  now: NOW,
}

describe("shouldRefreshToken", () => {
  it("skips the DB refresh for a fresh steady-state token", () => {
    expect(shouldRefreshToken(fresh)).toBe(false)
  })

  it("always refreshes on sign-in / signup / explicit update()", () => {
    expect(shouldRefreshToken({ ...fresh, trigger: "signIn" })).toBe(true)
    expect(shouldRefreshToken({ ...fresh, trigger: "signUp" })).toBe(true)
    expect(shouldRefreshToken({ ...fresh, trigger: "update" })).toBe(true)
  })

  it("refreshes a token that was never enriched (no membershipStatus)", () => {
    expect(shouldRefreshToken({ ...fresh, membershipStatus: undefined })).toBe(true)
  })

  it("keeps mid-onboarding tokens always-fresh", () => {
    expect(shouldRefreshToken({ ...fresh, onboardingCompleted: false })).toBe(true)
  })

  it("does not force-refresh solely because onboardingCompleted is undefined", () => {
    // undefined !== false — an enriched token within TTL still skips.
    expect(shouldRefreshToken({ ...fresh, onboardingCompleted: undefined })).toBe(false)
  })

  it("treats a legacy token with no refreshedAt as stale (refreshes once)", () => {
    expect(shouldRefreshToken({ ...fresh, refreshedAt: undefined })).toBe(true)
  })

  it("refreshes once the token is older than the TTL, not before", () => {
    // exactly at the boundary → refresh (>=)
    expect(shouldRefreshToken({ ...fresh, now: NOW + REFRESH_TTL_SEC })).toBe(true)
    // one second inside the window → skip
    expect(shouldRefreshToken({ ...fresh, now: NOW + REFRESH_TTL_SEC - 1 })).toBe(false)
  })

  it("respects a custom ttlSec", () => {
    expect(shouldRefreshToken({ ...fresh, now: NOW + 10, ttlSec: 5 })).toBe(true)
    expect(shouldRefreshToken({ ...fresh, now: NOW + 3, ttlSec: 5 })).toBe(false)
  })
})
