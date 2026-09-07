// Pure helpers + config for the transactional outbox (audit IP-5). No DB / no
// framework — unit-tested in isolation; the drain (drain.ts) orchestrates the
// DB side using these.

/** A failed group is retried until it has been attempted this many times. */
export const OUTBOX_MAX_ATTEMPTS = 6
/** Claim lease: a claimed row's next_attempt_at is pushed this far forward while
 *  it's processed, so a concurrent/next drain won't re-claim it — and a crashed
 *  drain's rows become due again once the lease lapses (at-least-once). */
export const OUTBOX_LEASE_MS = 60_000
/** Max rows claimed per drain tick. Bounds one invocation's work + lock span. */
export const OUTBOX_BATCH = 100

/** Exponential backoff (ms) before retrying a failed group: 30s, 1m, 2m, 4m,
 *  8m, … capped at 1h. `attempts` is the count AFTER the just-failed try. */
export function outboxBackoffMs(attempts: number): number {
  const ms = 30_000 * 2 ** Math.max(0, attempts - 1)
  return Math.min(ms, 3_600_000)
}

/** Rows sharing this key are one unit of work — the handler runs once for the
 *  group and the whole group is marked done together (e.g. every pending ranking
 *  recompute for one author collapses to a single run). A null dedupeKey falls
 *  back to the row id, so those rows are never coalesced. */
export function coalesceKey(row: { type: string; dedupeKey: string | null; id: string }): string {
  return `${row.type}::${row.dedupeKey ?? row.id}`
}

export interface ClaimedRow {
  id: string
  type: string
  payload: unknown
  dedupeKey: string | null
  attempts: number
}

export interface OutboxGroup {
  type: string
  payload: unknown
  ids: string[]
  /** Highest attempt count in the group — drives the fail/backoff decision. */
  attempts: number
}

/** Collapse claimed rows into coalesced groups. One representative payload per
 *  group (the first seen), all row ids retained. Pure. */
export function groupClaimed(rows: ClaimedRow[]): OutboxGroup[] {
  const groups = new Map<string, OutboxGroup>()
  for (const r of rows) {
    const k = coalesceKey(r)
    const g = groups.get(k)
    if (g) {
      g.ids.push(r.id)
      g.attempts = Math.max(g.attempts, r.attempts)
    } else {
      groups.set(k, { type: r.type, payload: r.payload, ids: [r.id], attempts: r.attempts })
    }
  }
  return [...groups.values()]
}
