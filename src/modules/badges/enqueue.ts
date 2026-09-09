import { enqueueOutbox } from "@/modules/outbox/enqueue";

/**
 * Enqueue a badge re-evaluation for a user (audit: transactional outbox).
 * `dedupeKey` collapses a burst of a user's actions into one evaluation; the
 * pg_cron drain (~15s) then runs it. Best-effort — a missed enqueue is caught
 * by the daily backstop cron (Phase 3). Fire-and-forget: never block the caller.
 */
export function enqueueBadgeEval(userId: string): Promise<void> {
  return enqueueOutbox({
    type: "evaluate_badges",
    payload: { userId },
    dedupeKey: `badges:${userId}`,
  }).catch((e) => {
    console.error("[badges] enqueue failed", e);
  });
}
