import { recomputeAuthorRanking } from "@/modules/feed/posts"

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
}
