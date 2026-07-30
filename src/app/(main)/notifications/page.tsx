import { requireUser } from "@/modules/auth/session"
import { listNotifications } from "@/modules/notifications/service"
import NotificationsClient from "./notifications-client"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const user = await requireUser()
  const rows = await listNotifications(user.id, 50)
  return (
    <NotificationsClient
      initial={rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        imageUrl: n.imageUrl,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  )
}
