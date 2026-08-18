// Ranking for the "Unverified members" worklist on /admin/verification.
// Dep-free so the weighting is unit-testable without prisma.

export interface CandidateSignal {
  endorsedCount: number      // peer vouches (Endorsement.status = "endorsed")
  profileCompletion: number  // 0..100
  hasJnvData: boolean        // school + class/years on file
}

/**
 * Higher = more worth an admin's attention. A single vouch outweighs any
 * profile-completeness gap (a batch-mate confirming you studied together is the
 * strongest signal we have), then profile completeness, then a small bump for
 * having JNV school data on file.
 */
export function scoreCandidate(s: CandidateSignal): number {
  return s.endorsedCount * 1000 + clampPct(s.profileCompletion) + (s.hasJnvData ? 25 : 0)
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}
