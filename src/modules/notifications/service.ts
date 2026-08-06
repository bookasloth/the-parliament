import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, type EmailTemplates } from "@/lib/email"

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
  | "mention"
  | "contact_reveal_request"
  | "new_event_in_batch"
  | "reaction_milestone"
  | "endorsement_request"
  | "endorsement_received"
  | "new_message"
  | "game_nudge"

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
  email?: K extends keyof EmailTemplates ? EmailTemplates[K] : never
  sendEmail?: boolean
}

export async function sendNotification<K extends NotificationKind>(
  input: NotificationInput<K>,
): Promise<void> {
  // Coalesce: if an unread notification of the same kind for the same entity is
  // still fresh, refresh it (bubble to top) instead of adding another row.
  let coalesced = false
  if (input.entityType && input.entityId) {
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

  if (!coalesced) {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.kind,
        title: input.title,
        body: input.body,
        entityType: input.entityType,
        entityId: input.entityId,
        imageUrl: input.imageUrl,
      },
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

export async function markRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  })
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
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
    where: { userId },
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
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  await prisma.notification.deleteMany({ where: { id, userId } })
}
