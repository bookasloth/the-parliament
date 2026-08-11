/**
 * Nudge decision logic — pure, DB-free so it can be unit-tested. The server
 * action gathers the facts (is this a connection? nudged recently?) and calls
 * `nudgeVerdict` to decide. Keeps auth/spam rules in one place.
 */

export type NudgeVerdict =
  | { ok: true }
  | { ok: false; reason: "self" | "not_connected" | "rate_limited" }

export interface NudgeFacts {
  actorId: string
  targetId: string
  /** actor follows target, or target follows actor. */
  isConnection: boolean
  /** actor already nudged this target within the cooldown window. */
  nudgedRecently: boolean
}

export function nudgeVerdict(f: NudgeFacts): NudgeVerdict {
  if (f.actorId === f.targetId) return { ok: false, reason: "self" }
  if (!f.isConnection) return { ok: false, reason: "not_connected" }
  if (f.nudgedRecently) return { ok: false, reason: "rate_limited" }
  return { ok: true }
}

/** One nudge per (actor → target) per day. */
export const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000

/** DM body a nudge sends. Also the rate-limit marker (same sender + body + window). */
export const NUDGE_MESSAGE = "👋 Come play today's Alfazy — the word's waiting. Beat me on the board!"
