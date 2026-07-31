"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Bell, Check, Loader2, Trash2 } from "lucide-react"
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "./actions"

export interface NotifRow {
  id: string
  type: string
  title: string
  body: string | null
  imageUrl: string | null
  isRead: boolean
  createdAt: string
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
        <div className="bg-white border border-gray-200 rounded-xl">
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

          <div className="p-2">
            {notifs.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="h-9 w-9 text-gray-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">You&rsquo;re all caught up</p>
                <p className="text-xs text-gray-400 mt-1">No new notifications</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {notifs.map((n) => (
                  <li key={n.id}>
                    <div
                      className={`relative flex gap-3 rounded-xl p-3 transition-colors ${
                        !n.isRead ? "bg-brand/5" : "hover:bg-gray-50"
                      }`}
                      onClick={() => !n.isRead && markOne(n.id)}
                    >
                      {!n.isRead && (
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-brand" />
                      )}
                      <div className="flex-shrink-0">
                        {n.imageUrl ? (
                          <Image
                            src={n.imageUrl}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                            <Bell className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        {n.body && (
                          <p className="text-sm text-gray-600 leading-snug mt-0.5">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-1">{relative(n.createdAt)}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          remove(n.id)
                        }}
                        className="absolute right-2 top-2 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
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
