import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

/**
 * Daily "what you missed" digest — the FLOOR of the re-engagement cadence
 * (guarantees ≥1 relevant email/day when there's something to say). Only sent to
 * users who have a PERSONAL signal (unread messages or new followers in the last
 * 24h), so it never reads as spam. Upcoming events ride along as bonus content.
 * deliver() still applies prefs, suppression and the daily frequency cap.
 */
export async function sendDailyDigests(): Promise<{ sent: number; candidates: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const now = new Date()
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // New followers in the last 24h, per user (cheap group-by).
  const followerGroups = await prisma.follow.groupBy({
    by: ["followingId"],
    where: { createdAt: { gte: since } },
    _count: { followerId: true },
  })
  const newFollowersByUser = new Map(followerGroups.map((g) => [g.followingId, g._count.followerId]))

  // Unread messages per user across all their conversations — one raw aggregate
  // (per-conversation lastReadAt can't be expressed with groupBy).
  const unreadRows = await prisma.$queryRaw<{ user_id: string; unread: number }[]>`
    SELECT cp.user_id, count(*)::int AS unread
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.deleted_at IS NULL
      AND m.sender_id <> cp.user_id
      AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
    GROUP BY cp.user_id
  `
  const unreadByUser = new Map(unreadRows.map((r) => [r.user_id, Number(r.unread)]))

  // Upcoming events (next 7 days) — school-wide bonus line, one count.
  const upcomingEvents = await prisma.event.count({
    where: { status: "published", startsAt: { gte: now, lte: weekAhead } },
  })

  // Only users with a personal signal are candidates.
  const userIds = new Set<string>([...newFollowersByUser.keys(), ...unreadByUser.keys()])
  if (userIds.size === 0) return { sent: 0, candidates: 0 }

  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] }, status: "active", deletedAt: null },
    select: { id: true, email: true },
  })
  const base = process.env.AUTH_URL || "https://nnawca.org"
  let sent = 0
  for (const u of users) {
    if (!u.email) continue
    const newFollowers = newFollowersByUser.get(u.id) ?? 0
    const unread = unreadByUser.get(u.id) ?? 0
    if (newFollowers === 0 && unread === 0) continue
    await sendEmail(
      "daily_digest",
      u.email,
      {
        newFollowers: String(newFollowers),
        unreadMessages: String(unread),
        upcomingEvents: String(upcomingEvents),
        feedUrl: `${base}/feed`,
      },
      u.id,
    )
    sent++
  }
  return { sent, candidates: users.length }
}
