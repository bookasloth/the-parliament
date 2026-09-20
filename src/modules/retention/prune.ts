import { prisma } from "@/lib/prisma"

// Retention prune (audit §5 #4/#5, IP-8). PostImpression (1 row per viewer×post)
// and Notification grew forever with no TTL — the two unbounded-growth walls at
// scale. This deletes rows past a retention window, which is all the read paths
// ever look at: the feed seen-filter reads the newest ~1000 impressions/user and
// the bell reads the newest 50 notifications, so anything older is dead weight.

export const IMPRESSION_RETENTION_DAYS = 90
export const NOTIFICATION_RETENTION_DAYS = 90

/** Instant `days` before `now`. Pure — the retention window lives here so it's
 *  unit-testable without a DB. */
export function retentionCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 86_400_000)
}

/**
 * Delete impressions/notifications older than their retention window.
 * Idempotent; safe to re-run. Runs daily from `/api/cron/retention`.
 *
 * ponytail: age-based prune only. It bounds both tables to a ~90-day window,
 * which covers every read path. If one spammed user's 90-day volume ever
 * dominates, layer a keep-newest-N-per-user windowed delete on top — not needed
 * at current scale.
 */
export async function runRetention(now = new Date()): Promise<{
  impressionsDeleted: number
  notificationsDeleted: number
}> {
  const impressions = await prisma.postImpression.deleteMany({
    where: { seenAt: { lt: retentionCutoff(now, IMPRESSION_RETENTION_DAYS) } },
  })
  const notifications = await prisma.notification.deleteMany({
    where: { createdAt: { lt: retentionCutoff(now, NOTIFICATION_RETENTION_DAYS) } },
  })
  return { impressionsDeleted: impressions.count, notificationsDeleted: notifications.count }
}
