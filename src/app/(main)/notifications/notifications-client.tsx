"use client"

import { useMemo, useState, useTransition } from "react"
import { Bell, Check, Loader2 } from "lucide-react"
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "./actions"
import { NotificationRow, type NotifView } from "@/components/shared/NotificationRow"
import { AlertAds } from "@/components/shared/AlertAds"

// Filter tabs → the notification kinds each bucket covers (null = everything).
// Buckets map to REAL kinds only (the old "Messages" tab was always empty — DMs
// are excluded server-side).
const FILTERS: { key: string; label: string; types: string[] | null }[] = [
  { key: "all", label: "All", types: null },
  { key: "unread", label: "Unread", types: null },
  { key: "mentions", label: "Mentions", types: ["mention"] },
  { key: "follows", label: "Follows", types: ["new_follower"] },
  { key: "reactions", label: "Reactions", types: ["reaction_on_post", "reaction_on_comment", "reaction_milestone", "award_on_post"] },
  { key: "comments", label: "Comments", types: ["comment_on_post"] },
]

export default function NotificationsClient({ initial, showAd = false }: { initial: NotifView[]; showAd?: boolean }) {
  const [notifs, setNotifs] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState("all")

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)
    if (!f || f.key === "all") return notifs
    if (f.key === "unread") return notifs.filter((n) => !n.isRead)
    return notifs.filter((n) => f.types?.includes(n.type))
  }, [notifs, filter])

  // New (unread) vs Earlier (read) — the FB-style split. Headers only show when
  // both groups have rows (a lone "Earlier" header would be noise).
  const { fresh, earlier } = useMemo(() => {
    const fresh: NotifView[] = []
    const earlier: NotifView[] = []
    for (const n of visible) (n.isRead ? earlier : fresh).push(n)
    return { fresh, earlier }
  }, [visible])
  const showHeaders = fresh.length > 0 && earlier.length > 0

  function remove(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id))
    startTransition(() => { deleteNotificationAction(id).catch(() => {}) })
  }
  function markOne(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    startTransition(() => { markNotificationReadAction(id).catch(() => {}) })
  }
  function markAll() {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })))
    startTransition(() => { markAllNotificationsReadAction().catch(() => {}) })
  }

  const section = (label: string, rows: NotifView[]) =>
    rows.length > 0 && (
      <>
        {showHeaders && (
          <li className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</li>
        )}
        {rows.map((n) => (
          <li key={n.id}>
            <NotificationRow item={n} variant="full" onOpen={markOne} onDelete={remove} />
          </li>
        ))}
      </>
    )

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f3f2ef] pb-16 lg:pb-6">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
        <div className="rounded-[5px] border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 sm:px-5 py-3.5">
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

          {notifs.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto border-b border-gray-100 px-3 py-2">
              {FILTERS.map((f) => {
                const count = f.key === "unread" ? notifs.filter((n) => !n.isRead).length : 0
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex-shrink-0 rounded-[3px] px-3 py-1 text-xs font-semibold transition-colors ${
                      filter === f.key ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                    {f.key === "unread" && count > 0 && (
                      <span className={`ml-1 ${filter === f.key ? "text-white/80" : "text-brand"}`}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          <div className="p-2">
            {showAd && (
              <div className="mb-1"><AlertAds placement="alerts" /></div>
            )}
            {notifs.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="mx-auto mb-2 h-9 w-9 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">You&rsquo;re all caught up</p>
                <p className="mt-1 text-xs text-gray-400">No new notifications</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="py-12 text-center"><p className="text-sm text-gray-500">Nothing here.</p></div>
            ) : (
              <ul className="space-y-0.5">
                {section("New", fresh)}
                {section("Earlier", earlier)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
