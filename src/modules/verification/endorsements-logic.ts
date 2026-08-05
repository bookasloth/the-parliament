// Pure endorsement logic — no prisma / server imports, so it's unit-testable in
// a plain node env. The DB-backed orchestration lives in endorsements.ts.

export interface EndorsementSummary {
  asked: number
  endorsed: number
  declined: number
}

/** Ranking signal for a suggested endorser. Higher score = surfaced first. */
export function endorserScore(sameBatch: boolean, sameHouse: boolean): { score: number; reason: string } {
  const score = (sameBatch ? 2 : 0) + (sameHouse ? 1 : 0)
  const reason = sameBatch && sameHouse
    ? "Same batch & house"
    : sameBatch
      ? "Same batch"
      : sameHouse
        ? "Same house"
        : "Studied in the same years"
  return { score, reason }
}

/** Fold grouped (verificationId, status, count) rows into per-id summaries. */
export function summarizeEndorsementRows(
  verificationIds: string[],
  rows: { verificationId: string; status: string; count: number }[],
): Map<string, EndorsementSummary> {
  const map = new Map<string, EndorsementSummary>()
  for (const id of verificationIds) map.set(id, { asked: 0, endorsed: 0, declined: 0 })
  for (const r of rows) {
    const s = map.get(r.verificationId)
    if (!s) continue
    s.asked += r.count
    if (r.status === "endorsed") s.endorsed += r.count
    if (r.status === "declined") s.declined += r.count
  }
  return map
}
