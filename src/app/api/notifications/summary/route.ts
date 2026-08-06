import { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { unreadCount, listNotifications, markAllRead, markRead } from "@/modules/notifications/service"
import { resolveNotifLinks } from "@/modules/notifications/links"

// GET → unread count + recent notifications for the navbar bell.
export async function GET() {
  try {
    const user = await requireUser()
    const [count, rows] = await Promise.all([unreadCount(user.id), listNotifications(user.id, 8)])
    const links = await resolveNotifLinks(rows)
    return ok({
      count,
      items: rows.map((n, i) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        imageUrl: n.imageUrl,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        href: links[i].href,
        ctas: links[i].ctas,
      })),
    })
  } catch (e) {
    return handleError(e)
  }
}

// POST → mark one notification read ({ id }), or all when no id is given.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === "string" ? body.id : null
    if (id) await markRead(user.id, id)
    else await markAllRead(user.id)
    return ok({ ok: true })
  } catch (e) {
    return handleError(e)
  }
}
