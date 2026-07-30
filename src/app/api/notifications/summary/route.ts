import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { unreadCount, listNotifications, markAllRead } from "@/modules/notifications/service"

function hrefFor(entityType: string | null, entityId: string | null): string {
  if (entityType === "post" && entityId) return `/feed/${entityId}`
  return "/notifications"
}

// GET → unread count + recent notifications for the navbar bell.
export async function GET() {
  try {
    const user = await requireUser()
    const [count, rows] = await Promise.all([unreadCount(user.id), listNotifications(user.id, 8)])
    return ok({
      count,
      items: rows.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        imageUrl: n.imageUrl,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        href: hrefFor(n.entityType, n.entityId),
      })),
    })
  } catch (e) {
    return handleError(e)
  }
}

// POST → mark everything read (the bell's "Clear Log").
export async function POST() {
  try {
    const user = await requireUser()
    await markAllRead(user.id)
    return ok({ ok: true })
  } catch (e) {
    return handleError(e)
  }
}
