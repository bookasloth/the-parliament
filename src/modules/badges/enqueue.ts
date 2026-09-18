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

/**
 * A user just became verified → re-evaluate their REFERRER's referral badge
 * (Influencer). Only the inviter's `referrals_verified` count changed, so we
 * enqueue the inviter, not the verified user. No-op when there's no inviter.
 */
export async function enqueueReferrerBadge(verifiedUserId: string): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const u = await prisma.user.findUnique({
      where: { id: verifiedUserId },
      select: { invitedById: true },
    });
    if (u?.invitedById) await enqueueBadgeEval(u.invitedById);
  } catch (e) {
    console.error("[badges] referrer enqueue failed", e);
  }
}
