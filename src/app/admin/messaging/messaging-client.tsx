"use client"

import { useRouter } from "next/navigation"
import { ChatCircle, Users, CaretLeft, CaretRight } from "@phosphor-icons/react"
import { PageHeader, StatCard, Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "../admin-ui"

export interface ConversationRow {
  id: string
  participants: string[]
  messageCount: number
  createdAt: string
  lastMessageAt: string
}

export interface MessagingStats {
  totalConversations: number
  totalMessages: number
  messagesLast24h: number
  activeLast7d: number
}

export interface MessagingPageInfo { page: number; pageCount: number; filteredTotal: number; pageSize: number }

export default function MessagingClient({
  rows,
  stats,
  pageInfo,
}: {
  rows: ConversationRow[]
  stats: MessagingStats
  pageInfo: MessagingPageInfo
}) {
  const router = useRouter()

  const total = pageInfo.filteredTotal
  const size = pageInfo.pageSize
  const page = pageInfo.page
  const last = pageInfo.pageCount
  const from = total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, total)
  const start = Math.max(1, Math.min(page - 2, last - 4))
  const nums = Array.from({ length: Math.min(5, last) }, (_, i) => start + i).filter((p) => p <= last)

  function goto(p: number) {
    router.push(p > 1 ? `/admin/messaging?page=${p}` : "/admin/messaging")
  }

  return (
    <div>
      <PageHeader
        title="Messaging"
        description="Direct-message oversight — metadata only, message contents are never shown"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Conversations" value={stats.totalConversations.toLocaleString()} icon={<ChatCircle className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Messages" value={stats.totalMessages.toLocaleString()} icon={<ChatCircle className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="Last 24h" value={stats.messagesLast24h.toLocaleString()} icon={<ChatCircle className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Active 7d" value={stats.activeLast7d.toLocaleString()} icon={<Users className="h-4.5 w-4.5" weight="duotone" />} accent="violet" />
      </div>

      <p className="mb-3 text-[11px] text-gray-500">
        Message contents and media are intentionally hidden for privacy — only conversation metadata is shown.
      </p>

      <div className="rounded-[4px] border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr>
                <Th>Participants</Th>
                <Th>Messages</Th>
                <Th>Created</Th>
                <Th>Last activity</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.length === 0 ? (
                <Tr>
                  <Td colSpan={4}>
                    <EmptyState icon={<ChatCircle className="h-7 w-7" weight="duotone" />} title="No conversations" description="No direct-message conversations exist yet." />
                  </Td>
                </Tr>
              ) : (
                rows.map((r) => (
                  <Tr key={r.id}>
                    <Td className="text-gray-800">{r.participants.length ? r.participants.join(" ↔ ") : "—"}</Td>
                    <Td className="text-gray-600">{r.messageCount.toLocaleString()}</Td>
                    <Td className="text-gray-600 whitespace-nowrap">{r.createdAt}</Td>
                    <Td className="text-gray-600 whitespace-nowrap">{r.lastMessageAt}</Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">Showing <span className="font-semibold text-gray-700">{from}–{to}</span> of <span className="font-semibold text-gray-700">{total.toLocaleString()}</span></p>
          <div className="flex items-center gap-1">
            <button onClick={() => goto(page - 1)} className="p-1.5 rounded-[3px] border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40" disabled={page <= 1}>
              <CaretLeft className="h-4 w-4" weight="duotone" />
            </button>
            {nums.map((p) => (
              <button key={p} onClick={() => goto(p)}
                className={`h-7 w-7 rounded-[3px] text-xs font-semibold ${page === p ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {p}
              </button>
            ))}
            {nums.length > 0 && nums[nums.length - 1] < last && <span className="text-xs text-gray-500 px-1">… {last}</span>}
            <button onClick={() => goto(page + 1)} className="p-1.5 rounded-[3px] border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40" disabled={page >= last}>
              <CaretRight className="h-4 w-4" weight="duotone" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
