// Pure, DB-free ad-tracking logic — validation, de-dup, batch capping, and the
// floor / make-good math. No Prisma import here so it's cheap to unit-test and can
// run on client or server. The service layer (service.ts) does the persistence.

import {
  AD_PLACEMENTS,
  AD_EVENT_KINDS,
  isKnownAdId,
  type AdPlacement,
  type AdEventKind,
} from "@/config/ad-tracking"

/** What the client beacon sends (untrusted — every field is validated below). */
export interface IncomingAdEvent {
  adId: string
  placement: string
  kind: string
}

/** A validated event ready to persist as one AdImpression row. */
export interface PreparedAdEvent {
  adId: string
  placement: AdPlacement
  kind: AdEventKind
  viewerId: string | null
  day: Date
}

/** Cap on events accepted per beacon call — a tampered client can't fan out an
 *  unbounded write. One page realistically fires a handful (feed ads + sidebar). */
export const AD_EVENT_BATCH_LIMIT = 20

/** Midnight-UTC bucket for an instant → the `@db.Date` day used for daily-unique
 *  de-dup. Pure and timezone-stable (uses UTC parts, not the runner's local zone). */
export function dayKeyUTC(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function isPlacement(v: string): v is AdPlacement {
  return (AD_PLACEMENTS as readonly string[]).includes(v)
}
function isEventKind(v: string): v is AdEventKind {
  return (AD_EVENT_KINDS as readonly string[]).includes(v)
}

/**
 * Validate, de-dup, and cap a raw beacon batch into rows ready for
 * `createMany({ skipDuplicates })`. Drops anything with an unknown placement,
 * unknown kind, or forged/unknown adId, and collapses duplicates within the batch
 * (the same viewer's repeat fires on one page). The DB unique key handles de-dup
 * *across* calls in the same day; this handles it *within* one call.
 */
export function prepareAdEventBatch(
  events: unknown,
  opts: { viewerId: string | null; now: Date; limit?: number },
): PreparedAdEvent[] {
  if (!Array.isArray(events)) return []
  const limit = opts.limit ?? AD_EVENT_BATCH_LIMIT
  const day = dayKeyUTC(opts.now)
  const seen = new Set<string>()
  const out: PreparedAdEvent[] = []

  for (const raw of events) {
    if (out.length >= limit) break
    if (!raw || typeof raw !== "object") continue
    const e = raw as Partial<IncomingAdEvent>
    if (typeof e.adId !== "string" || typeof e.placement !== "string" || typeof e.kind !== "string") continue
    if (!isPlacement(e.placement)) continue
    if (!isEventKind(e.kind)) continue
    if (!isKnownAdId(e.adId)) continue

    const key = `${e.placement}:${e.adId}:${e.kind}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ adId: e.adId, placement: e.placement, kind: e.kind, viewerId: opts.viewerId, day })
  }
  return out
}

// ── Floor / make-good math (used by the reporting + guarantee layer) ──────────

/** Whether delivered impressions clear a floor. */
export function meetsFloor(impressions: number, floor: number): boolean {
  return impressions >= floor
}

/** Impressions still owed to hit the floor (0 once met) — the size of the make-good. */
export function shortfall(impressions: number, floor: number): number {
  return Math.max(0, floor - impressions)
}

/** Click-through rate in [0,1]; 0 when there were no impressions (avoids /0). */
export function ctr(impressions: number, clicks: number): number {
  return impressions <= 0 ? 0 : clicks / impressions
}
