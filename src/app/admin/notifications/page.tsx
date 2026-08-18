import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { parsePage, pageCount, firstParam, PAGE_SIZE } from "@/modules/admin/pagination"
import NotificationsClient, { type NotificationRow } from "./notifications-client"

export const dynamic = "force-dynamic"

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const sp = await searchParams
  const { page, skip, take } = parsePage(sp.page)
  const type = firstParam(sp.type)

  const where: Prisma.NotificationWhereInput = {}
  if (type) where.type = type

  const [rows, filteredTotal, total, unread, typeGroups] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        createdAt: true,
        user: { select: { displayName: true, legalName: true, username: true } },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count(),
    prisma.notification.count({ where: { isRead: false } }),
    prisma.notification.groupBy({ by: ["type"], orderBy: { type: "asc" } }),
  ])

  const mapped: NotificationRow[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    recipient: n.user?.displayName || n.user?.legalName || n.user?.username || "—",
    isRead: n.isRead,
    createdAt: n.createdAt.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }))

  return (
    <NotificationsClient
      rows={mapped}
      types={typeGroups.map((g) => g.type)}
      stats={{ total, unread, read: total - unread }}
      query={{ page, type: type ?? "" }}
      pageInfo={{ page, pageCount: pageCount(filteredTotal), filteredTotal, pageSize: PAGE_SIZE }}
    />
  )
}
