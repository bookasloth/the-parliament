import { requireUser } from "@/modules/auth/session"
import { listNotifications } from "@/modules/notifications/service"
import { resolveNotifLinks } from "@/modules/notifications/links"
import NotificationsClient from "./notifications-client"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const user = await requireUser()
  const rows = await listNotifications(user.id, 50)
  const links = await resolveNotifLinks(rows)
  return (
    <NotificationsClient
      initial={rows.map((n, i) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        imageUrl: n.imageUrl,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        href: links[i].href,
        ctas: links[i].ctas,
      }))}
    />
  )
}
