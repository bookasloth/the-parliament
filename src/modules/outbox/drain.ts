import { prisma } from "@/lib/prisma"
import {
  OUTBOX_BATCH,
  OUTBOX_LEASE_MS,
  OUTBOX_MAX_ATTEMPTS,
  outboxBackoffMs,
  groupClaimed,
  type ClaimedRow,
} from "./types"
import { OUTBOX_HANDLERS } from "./handlers"

export interface DrainResult {
  claimed: number
  done: number
  failed: number
  retry: number
}

/**
 * Drain due outbox events (audit IP-5). Pinged by cron / pg_cron.
 *
 * Claim: one UPDATE leases a batch of due `pending` rows (pushes next_attempt_at
 * forward + bumps attempts) using `FOR UPDATE SKIP LOCKED`, so concurrent drains
 * never touch the same rows and a crashed drain's rows re-surface after the lease
 * (at-least-once). Claimed rows are coalesced by (type, dedupeKey); each group's
 * handler runs once. Success marks the whole group `done`; failure retries with
 * exponential backoff until OUTBOX_MAX_ATTEMPTS, then `failed`.
 */
export async function drainOutbox(opts: { now?: Date; batchSize?: number } = {}): Promise<DrainResult> {
  const now = opts.now ?? new Date()
  const batchSize = opts.batchSize ?? OUTBOX_BATCH
  const leaseUntil = new Date(now.getTime() + OUTBOX_LEASE_MS)

  const claimedRows = await prisma.$queryRaw<
    { id: string; type: string; payload: unknown; dedupe_key: string | null; attempts: number }[]
  >`
    UPDATE outbox_events
    SET next_attempt_at = ${leaseUntil}, attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM outbox_events
      WHERE status = 'pending' AND next_attempt_at <= ${now}
      ORDER BY next_attempt_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, payload, dedupe_key, attempts
  `
  if (claimedRows.length === 0) return { claimed: 0, done: 0, failed: 0, retry: 0 }

  const rows: ClaimedRow[] = claimedRows.map((r) => ({
    id: r.id,
    type: r.type,
    payload: r.payload,
    dedupeKey: r.dedupe_key,
    attempts: r.attempts,
  }))

  let done = 0
  let failed = 0
  let retry = 0
  for (const g of groupClaimed(rows)) {
    try {
      const handler = OUTBOX_HANDLERS[g.type]
      if (!handler) throw new Error(`no outbox handler for type "${g.type}"`)
      await handler(g.payload)
      await prisma.outboxEvent.updateMany({
        where: { id: { in: g.ids } },
        data: { status: "done", processedAt: new Date(), lastError: null },
      })
      done += g.ids.length
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500)
      if (g.attempts >= OUTBOX_MAX_ATTEMPTS) {
        await prisma.outboxEvent.updateMany({
          where: { id: { in: g.ids } },
          data: { status: "failed", lastError: msg },
        })
        failed += g.ids.length
      } else {
        await prisma.outboxEvent.updateMany({
          where: { id: { in: g.ids } },
          data: {
            status: "pending",
            nextAttemptAt: new Date(now.getTime() + outboxBackoffMs(g.attempts)),
            lastError: msg,
          },
        })
        retry += g.ids.length
      }
    }
  }
  return { claimed: claimedRows.length, done, failed, retry }
}
