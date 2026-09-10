"use server"

// Server action the client beacon calls to record ad impressions/clicks. Mirrors
// the feed's recordImpressionsAction: fire-and-forget from the client, cheap, and
// hardened against tampering (unknown ids/placements are dropped in tracking.ts,
// and the batch is capped). The viewer id comes from the session, never the
// client, so impressions can't be attributed to someone else.

import { optionalUser } from "@/modules/auth/session"
import { enforceRateLimit } from "@/lib/rate-limit"
import { prepareAdEventBatch, type IncomingAdEvent } from "./tracking"
import { recordAdEvents } from "./service"

export async function recordAdEventsAction(events: IncomingAdEvent[]): Promise<{ recorded: number }> {
  const viewer = await optionalUser()

  // Bound how often one viewer can write — a page fires a handful; this only trips
  // on abuse. Keyed by viewer when signed in, else a shared anon bucket.
  try {
    await enforceRateLimit({
      bucket: "ads.track",
      identifier: viewer?.id ?? "anon",
      limit: 120,
      windowSec: 60,
    })
  } catch {
    // Rate-limited: silently drop. Ad telemetry is best-effort, never user-facing.
    return { recorded: 0 }
  }

  const prepared = prepareAdEventBatch(events, { viewerId: viewer?.id ?? null, now: new Date() })
  if (prepared.length === 0) return { recorded: 0 }

  try {
    const recorded = await recordAdEvents(prepared)
    return { recorded }
  } catch {
    // Never let telemetry failures surface to the member mid-scroll.
    return { recorded: 0 }
  }
}
