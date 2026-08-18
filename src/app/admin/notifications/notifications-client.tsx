"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Megaphone, CaretLeft, CaretRight, CheckCircle } from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, Button, Modal, Table, Thead, Tbody, Tr, Th, Td, EmptyState, useToast, useRowAction } from "../admin-ui"
import { broadcast } from "./actions"

export interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  recipient: string
  isRead: boolean
  createdAt: string
}

export interface NotificationQuery { page: number; type: string }
export interface NotificationPageInfo { page: number; pageCount: number; filteredTotal: number; pageSize: number }
export interface NotificationStats { total: number; unread: number; read: number }

export default function NotificationsClient({
  rows,
  types = [],
  stats,
  query,
  pageInfo,
}: {
  rows: NotificationRow[]
  types?: string[]
  stats: NotificationStats
  query?: NotificationQuery
  pageInfo?: NotificationPageInfo
}) {
  const router = useRouter()
  const q0 = query ?? { page: 1, type: "" }

  function pushQuery(patch: Partial<NotificationQuery>) {
    const next = { ...q0, ...patch }
    if (patch.page === undefined) next.page = 1
    const params = new URLSearchParams()
    if (next.type) params.set("type", next.type)
    if (next.page > 1) params.set("page", String(next.page))
    const qs = params.toString()
    router.push(qs ? `/admin/notifications?${qs}` : "/admin/notifications")
  }

  const total = pageInfo?.filteredTotal ?? rows.length
  const size = pageInfo?.pageSize ?? rows.length
  const page = pageInfo?.page ?? 1
  const last = pageInfo?.pageCount ?? 1
  const from = total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, total)
  const start = Math.max(1, Math.min(page - 2, last - 4))
  const nums = Array.from({ length: Math.min(5, last) }, (_, i) => start + i).filter((p) => p <= last)

  // Broadcast modal state
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [type, setType] = useState("announcement")
  const toast = useToast()
  const { run, isBusy } = useRowAction()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    run("send", {
      action: async () => {
        const r = await broadcast({ title, body: body || undefined, type })
        toast.success(`Sent to ${r.count.toLocaleString()} member${r.count === 1 ? "" : "s"}.`)
        setTitle("")
        setBody("")
        setOpen(false)
        router.refresh() // notification appears in the server-rendered list
      },
      error: "Failed to send broadcast.",
    })
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Every notification delivered across the network — and one-click platform broadcasts"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Megaphone className="h-4 w-4" weight="duotone" /> Broadcast
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total" value={stats.total.toLocaleString()} icon={<Bell className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Unread" value={stats.unread.toLocaleString()} icon={<Bell className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Read" value={stats.read.toLocaleString()} icon={<CheckCircle className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={q0.type || "All"}
          onChange={(e) => pushQuery({ type: e.target.value === "All" ? "" : e.target.value })}
          className="rounded-[4px] border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-600"
        >
          {["All", ...types].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="rounded-[4px] border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr className="border-b border-gray-200 hover:bg-transparent">
                <Th>Recipient</Th>
                <Th>Type</Th>
                <Th>Title</Th>
                <Th>Read</Th>
                <Th>Created</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.length === 0 && (
                <Tr className="hover:bg-transparent">
                  <Td colSpan={5}>
                    <EmptyState
                      icon={<Bell className="h-8 w-8" weight="duotone" />}
                      title="No notifications"
                      description="Nothing has been delivered for this filter yet."
                    />
                  </Td>
                </Tr>
              )}
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap text-gray-800">{r.recipient}</Td>
                  <Td className="whitespace-nowrap">
                    <span className="rounded-[3px] bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">{r.type}</span>
                  </Td>
                  <Td className="max-w-[360px]">
                    <span className="text-gray-800">{r.title}</span>
                    {r.body && <span className="block truncate text-[11px] text-gray-500" title={r.body}>{r.body}</span>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {r.isRead
                      ? <StatusBadge status="resolved" />
                      : <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> unread</span>}
                  </Td>
                  <Td className="whitespace-nowrap text-gray-600">{r.createdAt}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">Showing <span className="font-semibold text-gray-700">{from}–{to}</span> of <span className="font-semibold text-gray-700">{total.toLocaleString()}</span></p>
          <div className="flex items-center gap-1">
            <button onClick={() => pushQuery({ page: page - 1 })} className="p-1.5 rounded-[3px] border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40" disabled={page <= 1}>
              <CaretLeft className="h-4 w-4" weight="duotone" />
            </button>
            {nums.map((p) => (
              <button key={p} onClick={() => pushQuery({ page: p })}
                className={`h-7 w-7 rounded-[3px] text-xs font-semibold ${page === p ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {p}
              </button>
            ))}
            {nums.length > 0 && nums[nums.length - 1] < last && <span className="text-xs text-gray-500 px-1">… {last}</span>}
            <button onClick={() => pushQuery({ page: page + 1 })} className="p-1.5 rounded-[3px] border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40" disabled={page >= last}>
              <CaretRight className="h-4 w-4" weight="duotone" />
            </button>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Broadcast to all members">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder="Reunion registrations are open"
              className="w-full rounded-[4px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Optional details…"
              className="w-full rounded-[4px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-600 resize-y"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Type</label>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              maxLength={40}
              className="w-full rounded-[4px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button type="submit" disabled={isBusy("send") || !title.trim()}>
              <Megaphone className="h-4 w-4" weight="duotone" /> {isBusy("send") ? "Sending…" : "Send broadcast"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
