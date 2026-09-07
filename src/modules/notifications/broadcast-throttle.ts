import { redis } from "@/lib/redis"

// Coalesces the notification-bell "refetch" nudge (audit): sendNotification used
// to fire one realtime broadcast per send, so a viral post's reaction storm sent
// one broadcast per like to the AUTHOR's own session — 1M likes → 1M refetches, a
// self-DoS. Two gates now bound it: skip on a coalesced row (no unread-count
// change → nothing to refetch), and this per-user rate window (collapses a burst
// across DIFFERENT entities into one nudge too). The nudge is idempotent — it
// only says "refetch" — so dropping extras is safe; the client poll is the
// backstop.

export const BROADCAST_THROTTLE_MS = 2000

/**
 * True if a bell-refresh broadcast is allowed for this user right now — i.e. none
 * was sent within the window. Uses a Redis NX+TTL key as the window latch.
 * Fail-OPEN: if Redis is unavailable we allow the broadcast, so realtime delivery
 * never silently dies on a cache outage.
 */
export async function throttleBroadcast(userId: string, windowMs = BROADCAST_THROTTLE_MS): Promise<boolean> {
  try {
    const set = await redis.set(`notif:bcast:${userId}`, 1, { nx: true, px: windowMs })
    return set !== null // "OK" = latch acquired (allow); null = already latched (suppress)
  } catch {
    return true
  }
}
