import { prisma } from "@/lib/prisma"
import { sendEmail, type EmailTemplates } from "@/lib/email"

export type NotificationKind =
  | "verification_approved"
  | "verification_rejected"
  | "connection_request"
  | "comment_on_post"
  | "reaction_on_post"
  | "mention"
  | "contact_reveal_request"
  | "new_event_in_batch"

const EMAIL_FOR_KIND: { [K in NotificationKind]?: keyof EmailTemplates } = {
  verification_approved: "verification_approved",
  verification_rejected: "verification_rejected",
  connection_request: "connection_request",
  comment_on_post: "comment_on_post",
  reaction_on_post: "reaction_on_post",
  mention: "mention",
  contact_reveal_request: "contact_reveal_request",
  new_event_in_batch: "new_event_in_batch",
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

  const wantEmail = input.sendEmail ?? true
  if (!wantEmail) return

  const tpl = EMAIL_FOR_KIND[input.kind]
  if (!tpl || !input.email) return

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  })
  if (!user?.email) return

  try {
    await sendEmail(tpl, user.email, input.email as never)
  } catch (e) {
    console.error("Notification email failed:", e)
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
