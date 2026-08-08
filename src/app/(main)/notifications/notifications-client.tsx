"use client"

import { useMemo, useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { Bell, Check, Loader2, Trash2 } from "lucide-react"
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "./actions"

// Filter tabs → the notification types each bucket covers (null = everything).
const FILTERS: { key: string; label: string; types: string[] | null }[] = [
  { key: "all", label: "All", types: null },
  { key: "unread", label: "Unread", types: null },
  { key: "follows", label: "Follows", types: ["new_follower"] },
  { key: "reactions", label: "Reactions", types: ["reaction_on_post", "reaction_milestone"] },
  { key: "comments", label: "Comments", types: ["comment_on_post", "mention"] },
  { key: "messages", label: "Messages", types: ["new_message"] },
]

export interface NotifRow {
  id: string
  type: string
  title: string
  body: string | null
  imageUrl: string | null
  isRead: boolean
  createdAt: string
  href: string
  ctas: { label: string; href: string; primary?: boolean }[]
}

function relative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

export default function NotificationsClient({ initial }: { initial: NotifRow[] }) {
  const [notifs, setNotifs] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState("all")

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)
    if (!f || f.key === "all") return notifs
    if (f.key === "unread") return notifs.filter((n) => !n.isRead)
    return notifs.filter((n) => f.types?.includes(n.type))
  }, [notifs, filter])

  function remove(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id))
    startTransition(() => {
      deleteNotificationAction(id).catch(() => {})
    })
  }

  function markOne(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    startTransition(() => {
      markNotificationReadAction(id).catch(() => {})
    })
  }

  function markAll() {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })))
    startTransition(() => {
      markAllNotificationsReadAction().catch(() => {})
    })
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f3f2ef] pb-16 lg:pb-6">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
        <div className="bg-white border border-gray-200 rounded-[5px]">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100">
            <h1 className="text-base font-bold text-gray-900">Notifications</h1>
            <button
              onClick={markAll}
              disabled={pending || notifs.every((n) => n.isRead)}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Mark all read
            </button>
          </div>

          {/* Type filters */}
          {notifs.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-gray-100">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex-shrink-0 rounded-[3px] px-3 py-1 text-xs font-semibold transition-colors ${
                    filter === f.key ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-2">
            {notifs.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="h-9 w-9 text-gray-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">You&rsquo;re all caught up</p>
                <p className="text-xs text-gray-400 mt-1">No new notifications</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-500">Nothing here.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {visible.map((n) => (
                  <li key={n.id}>
                    <div
                      className={`relative rounded-[5px] p-3 transition-colors ${
                        !n.isRead ? "bg-brand/5" : "hover:bg-gray-50"
                      }`}
                    >
                      {!n.isRead && (
                        <span className="absolute left-1 top-4 h-2 w-2 rounded-full bg-brand" />
                      )}
                      <Link href={n.href} onClick={() => markOne(n.id)} className="flex gap-3">
                        <div className="flex-shrink-0">
                          {n.imageUrl ? (
                            <Image
                              src={n.imageUrl}
                              alt=""
                              className="h-10 w-10 rounded-[4px] object-cover"
                              width={40}
                              height={40}
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-brand-100 text-brand-700">
                              <Bell className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          {n.body && (
                            <p className="text-sm text-gray-600 leading-snug mt-0.5">{n.body}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-1">{relative(n.createdAt)}</p>
                        </div>
                      </Link>
                      {n.ctas.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 pl-[52px]">
                          {n.ctas.map((c) => (
                            <Link
                              key={c.label + c.href}
                              href={c.href}
                              onClick={() => markOne(n.id)}
                              className={
                                c.primary
                                  ? "rounded-[3px] bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600"
                                  : "rounded-[3px] border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                              }
                            >
                              {c.label}
                            </Link>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          remove(n.id)
                        }}
                        className="absolute right-2 top-2 p-1.5 rounded-[3px] text-gray-400 hover:text-red-500 hover:bg-red-50"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
