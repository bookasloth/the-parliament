import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { parsePage, pageCount, PAGE_SIZE } from "@/modules/admin/pagination"
import MessagingClient, { type ConversationRow } from "./messaging-client"

export const dynamic = "force-dynamic"

export default async function AdminMessagingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const sp = await searchParams
  const { page, skip, take } = parsePage(sp.page)

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [conversations, filteredTotal, totalMessages, messagesLast24h, activeLast7d] = await Promise.all([
    prisma.conversation.findMany({
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      skip,
      take,
      select: {
        id: true,
        createdAt: true,
        lastMessageAt: true,
        participants: {
          select: { user: { select: { displayName: true, legalName: true, username: true } } },
        },
        _count: { select: { messages: true } },
      },
    }),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.message.count({ where: { createdAt: { gte: since24h } } }),
    prisma.conversation.count({ where: { lastMessageAt: { gte: since7d } } }),
  ])

  const rows: ConversationRow[] = conversations.map((c) => ({
    id: c.id,
    participants: c.participants.map(
      (p) => p.user.displayName || p.user.legalName || p.user.username || "Unknown",
    ),
    messageCount: c._count.messages,
    createdAt: c.createdAt.toLocaleDateString(),
    lastMessageAt: c.lastMessageAt ? c.lastMessageAt.toLocaleString() : "—",
  }))

  return (
    <MessagingClient
      rows={rows}
      stats={{
        totalConversations: filteredTotal,
        totalMessages,
        messagesLast24h,
        activeLast7d,
      }}
      pageInfo={{ page, pageCount: pageCount(filteredTotal), filteredTotal, pageSize: PAGE_SIZE }}
    />
  )
}
