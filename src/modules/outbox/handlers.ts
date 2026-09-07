import { recomputeAuthorRanking } from "@/modules/feed/posts"
import { sendEventInviteChunk } from "@/modules/events/invites"

// Outbox handler registry (audit IP-5). One entry per event `type`. A handler
// must be idempotent — a group is retried on failure and the same intent may be
// delivered more than once (at-least-once). Add producers by enqueuing a `type`
// here; the drain dispatches to it.
export type OutboxHandler = (payload: unknown) => Promise<void>

export const OUTBOX_HANDLERS: Record<string, OutboxHandler> = {
  // Re-rank an author's recent posts after their reputation shifts (a vote on any
  // of their posts). Moved off the reaction request path — it was up to 100
  // synchronous UPDATEs per vote (audit's #1 scale risk). Coalesced per author.
  recompute_author_ranking: async (payload) => {
    const authorId = (payload as { authorId?: string })?.authorId
    if (authorId) await recomputeAuthorRanking(authorId)
  },

  // Deliver one page of an event-invite wave to a membership tier and re-enqueue
  // a continuation if more remain (audit IP-5). Replaces the old inline 5000-cap
  // serial loop in sendWave.
  fanout_event_invite: async (payload) => {
    const p = payload as { eventId?: string; tier?: string; cursor?: string | null; pageSize?: number }
    if (p?.eventId && p?.tier) await sendEventInviteChunk({ eventId: p.eventId, tier: p.tier, cursor: p.cursor, pageSize: p.pageSize })
  },
}
