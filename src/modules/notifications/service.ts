import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import { sendEmail, type EmailTemplates } from "@/lib/email"
import { broadcastToUser } from "@/lib/supabase-realtime"
import { sendPush } from "@/lib/web-push"

export function pushUrlFor(entityType?: string, entityId?: string): string {
  if (entityType === "post" && entityId) return `/feed/${entityId}`
  if (entityType === "conversation" && entityId) return `/messages/${entityId}`
  return "/notifications"
}

// A burst of the same kind on the same entity (e.g. many reactions on one post)
// coalesces into a single unread row within this window instead of spamming the
// bell — the row bubbles back to the top and its email is suppressed.
const COALESCE_WINDOW_MS = 6 * 60 * 60 * 1000

export type NotificationKind =
  | "verification_approved"
  | "verification_rejected"
  | "new_follower"
  | "comment_on_post"
  | "reaction_on_post"
  | "share_on_post"
  | "award_on_post"
  | "reaction_on_comment"
  | "business_review"
  | "event_rsvp"
  | "group_join"
  | "group_request"
  | "mention"
  | "contact_reveal_request"
  | "new_event_in_batch"
  | "reaction_milestone"
  | "endorsement_request"
  | "endorsement_received"
  | "new_message"
  | "game_nudge"
  | "egg_thrown"
  | "egg_volunteer"
  | "moderation_warning"

const EMAIL_FOR_KIND: { [K in NotificationKind]?: keyof EmailTemplates } = {
  verification_approved: "verification_approved",
  verification_rejected: "verification_rejected",
  new_follower: "new_follower",
  comment_on_post: "comment_on_post",
  reaction_on_post: "reaction_on_post",
  mention: "mention",
  contact_reveal_request: "contact_reveal_request",
  new_event_in_batch: "new_event_in_batch",
  reaction_milestone: "reaction_milestone",
  endorsement_request: "endorsement_request",
  moderation_warning: "moderation_warning",
  group_request: "group_request",
  // endorsement_received is in-app only (no email template).
}

export interface NotificationInput<K extends NotificationKind> {
  userId: string
  kind: K
  title: string
  body?: string
  entityType?: string
  entityId?: string
  imageUrl?: string
  /** Who triggered this (audit P1-4) — enables grouping, block-suppression and
   *  re-render after a rename. Optional; older call sites omit it. */
  actorId?: string
  email?: K extends keyof EmailTemplates ? EmailTemplates[K] : never
  sendEmail?: boolean
}

// In-app + push preferences (audit P1-5). Absent row = all on. Cached per request
// is unnecessary (one lookup per notification); kept simple.
async function loadPrefs(userId: string): Promise<{ pushEnabled: boolean; mutedKinds: string[] }> {
  try {
    const row = await prisma.notificationPreference.findUnique({ where: { userId } })
    return { pushEnabled: row?.pushEnabled ?? true, mutedKinds: row?.mutedKinds ?? [] }
  } catch {
    return { pushEnabled: true, mutedKinds: [] }
  }
}

export async function sendNotification<K extends NotificationKind>(
  input: NotificationInput<K>,
): Promise<void> {
  // Preferences (audit P1-5): a muted kind creates no bell row and no push (email
  // for that kind is still governed separately by EmailPreference). DMs are never
  // muteable here (they're the messages inbox, not the bell).
  const prefs = await loadPrefs(input.userId)
  const muted = input.kind !== "new_message" && prefs.mutedKinds.includes(input.kind)

  // Coalesce: if an unread notification of the same kind for the same entity is
  // still fresh, refresh it (bubble to top) instead of adding another row.
  let coalesced = false
  if (!muted && input.entityType && input.entityId) {
    const recent = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.kind,
        entityType: input.entityType,
        entityId: input.entityId,
        isRead: false,
        createdAt: { gt: new Date(Date.now() - COALESCE_WINDOW_MS) },
      },
      select: { id: true },
    })
    if (recent) {
      await prisma.notification.update({
        where: { id: recent.id },
        data: { title: input.title, body: input.body, imageUrl: input.imageUrl, createdAt: new Date() },
      })
      coalesced = true
    }
  }

  if (!muted && !coalesced) {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.kind,
        actorId: input.actorId,
        title: input.title,
        body: input.body,
        entityType: input.entityType,
        entityId: input.entityId,
        imageUrl: input.imageUrl,
      },
    })
    // Bump Redis unread counter (DMs don't count toward bell)
    if (input.kind !== "new_message") {
      try { await redis.incr(`notif:unread:${input.userId}`) } catch {}
    }
  }

  // Nudge the recipient's notification bell to refetch instantly (realtime),
  // instead of waiting out its poll. Best-effort; the poll is the fallback.
  if (!muted) void broadcastToUser(input.userId, "notification", { at: Date.now() })

  // Web push to the device (works when the tab is closed). Skip on a coalesced
  // burst so one post's reaction storm doesn't buzz the phone repeatedly, when
  // the kind is muted, or when the viewer turned push off (audit P1-5).
  if (!muted && !coalesced && prefs.pushEnabled) {
    void sendPush(input.userId, {
      title: input.title,
      body: input.body,
      url: pushUrlFor(input.entityType, input.entityId),
      icon: input.imageUrl,
      tag: input.entityType && input.entityId ? `${input.entityType}:${input.entityId}` : undefined,
    })
  }

  // Email is best-effort and must not add latency to the triggering action
  // (follow/comment/reaction). Defer it past the response with after(); suppress
  // it on a coalesced burst so one post's reaction storm doesn't email N times.
  const wantEmail = (input.sendEmail ?? true) && !coalesced
  const tpl = EMAIL_FOR_KIND[input.kind]
  if (!wantEmail || !tpl || !input.email) return

  const deliver = async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true },
      })
      if (!user?.email) return
      await sendEmail(tpl, user.email, input.email as never, input.userId)
    } catch (e) {
      console.error("Notification email failed:", e)
    }
  }
  // Defer past the response in a request scope; fall back to fire-and-forget for
  // any non-request caller (cron) where after() isn't available.
  try {
    after(deliver)
  } catch {
    void deliver()
  }
}

/**
 * Delete notifications that point at a now-gone entity (audit P1-4) so their
 * deep links don't 404. Resets the affected users' cached unread counters so the
 * bell count doesn't drift. Best-effort.
 */
export async function deleteNotificationsForEntity(entityType: string, entityId: string): Promise<void> {
  const affected = await prisma.notification.findMany({
    where: { entityType, entityId },
    select: { userId: true },
  })
  if (affected.length === 0) return
  await prisma.notification.deleteMany({ where: { entityType, entityId } })
  // Force each affected user's counter to recompute from the DB on next read.
  const userIds = [...new Set(affected.map((a) => a.userId))]
  await Promise.all(userIds.map((id) => redis.del(`notif:unread:${id}`).catch(() => {})))
}

// User-muteable notification kinds (audit P1-5), with display labels. Not every
// kind is here — account/verification/moderation notifications are not muteable.
export const MUTEABLE_KINDS: { kind: NotificationKind; label: string }[] = [
  { kind: "reaction_on_post", label: "Reactions on your posts" },
  { kind: "comment_on_post", label: "Comments & replies" },
  { kind: "share_on_post", label: "Shares of your posts" },
  { kind: "award_on_post", label: "Awards on your posts" },
  { kind: "reaction_on_comment", label: "Likes on your comments" },
  { kind: "new_follower", label: "New followers" },
  { kind: "mention", label: "Mentions" },
  { kind: "group_join", label: "New members in your groups" },
  { kind: "group_request", label: "Group requests" },
  { kind: "event_rsvp", label: "RSVPs to your events" },
  { kind: "business_review", label: "Reviews on your business" },
]
const MUTEABLE_SET = new Set(MUTEABLE_KINDS.map((m) => m.kind as string))

export interface NotificationPrefs {
  pushEnabled: boolean
  mutedKinds: string[]
}

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const row = await prisma.notificationPreference.findUnique({ where: { userId } })
  return { pushEnabled: row?.pushEnabled ?? true, mutedKinds: row?.mutedKinds ?? [] }
}

/** Persist bell/push prefs. Only known muteable kinds are stored (trust boundary). */
export async function setNotificationPrefs(userId: string, input: NotificationPrefs): Promise<void> {
  const mutedKinds = [...new Set(input.mutedKinds)].filter((k) => MUTEABLE_SET.has(k))
  await prisma.notificationPreference.upsert({
    where: { userId },
    update: { pushEnabled: input.pushEnabled, mutedKinds },
    create: { userId, pushEnabled: input.pushEnabled, mutedKinds },
  })
}

export async function markRead(userId: string, notificationId: string) {
  const res = await prisma.notification.updateMany({
    where: { id: notificationId, userId, isRead: false, type: { not: "new_message" } },
    data: { isRead: true, readAt: new Date() },
  })
  // Only decrement when a counted unread actually flipped (audit P1-4): the old
  // code decremented on every call, so marking an already-read notification (or
  // a DM row that never counted) drifted the counter permanently negative.
  if (res.count > 0) {
    try { await redis.decr(`notif:unread:${userId}`) } catch {}
  }
}

export async function unreadCount(userId: string): Promise<number> {
  // Redis counter is the fast path; DB is the fallback + source of truth.
  try {
    const cached = await redis.get<number>(`notif:unread:${userId}`)
    // A negative cached value means the counter drifted — fall through to
    // recompute from the DB and reseed, so it self-heals (audit P1-4).
    if (cached !== null && cached !== undefined && cached >= 0) return cached
  } catch {}
  const count = await prisma.notification.count({
    where: { userId, isRead: false, type: { not: "new_message" } },
  })
  // Seed Redis so the next call is fast
  try { await redis.set(`notif:unread:${userId}`, count) } catch {}
  return count
}

export interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  imageUrl: string | null
  entityType: string | null
  entityId: string | null
  isRead: boolean
  createdAt: Date
}

export async function listNotifications(
  userId: string,
  limit = 50,
): Promise<NotificationRow[]> {
  return prisma.notification.findMany({
    // DMs live in the messages inbox, never the notification bell/list.
    where: { userId, type: { not: "new_message" } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      imageUrl: true,
      entityType: true,
      entityId: true,
      isRead: true,
      createdAt: true,
    },
  })
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })
  try { await redis.del(`notif:unread:${userId}`) } catch {}
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  // Check if unread before deleting — need to adjust counter
  const row = await prisma.notification.findFirst({ where: { id, userId }, select: { isRead: true, type: true } })
  await prisma.notification.deleteMany({ where: { id, userId } })
  // Only unread, counted (non-DM) rows contributed to the counter.
  if (row && !row.isRead && row.type !== "new_message") {
    try { await redis.decr(`notif:unread:${userId}`) } catch {}
  }
}
