"use client"

import { useState, useRef, useEffect } from "react"
import {
  MoreHorizontal, Check, BellOff, Bell, Trash2, VolumeX, Loader2,
  Home, Users, Calendar, Plus, Menu,
} from "lucide-react"

type NotifType = "connection" | "birthday" | "activity" | "premium" | "generic"

interface Notif {
  id: string
  type: NotifType
  avatar?: string
  initials?: string
  initialsBg?: string
  blurAvatar?: boolean
  body: React.ReactNode
  time: string
  unread: boolean
  highlight?: boolean
}

const initialNotifs: Notif[] = [
  {
    id: "n1", type: "connection",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    body: <><b>Durga Laxne</b> sent you a connection request.</>,
    time: "Just now", unread: true,
  },
  {
    id: "n2", type: "birthday",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    body: <>Wish <b>Shubham Bansod</b> a happy birthday (Nov 10)</>,
    time: "Just now", unread: true,
  },
  {
    id: "n3", type: "activity",
    initials: "WB", initialsBg: "#70ad47",
    body: <>StackBros has 15 likes and 1 new activity</>,
    time: "2 min", unread: true,
  },
  {
    id: "n4", type: "premium",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    blurAvatar: true, highlight: true,
    body: <><b>3 people</b> viewed your profile. Stay anonymous and see who&rsquo;s viewed your profile with Premium Membership.</>,
    time: "5h", unread: true,
  },
  {
    id: "n5", type: "generic",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    body: <><b>Neha Gupta</b> reacted to your post in <b>Career Advice</b>.</>,
    time: "8h", unread: false,
  },
  {
    id: "n6", type: "generic",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    body: <><b>Vikram Singh</b> mentioned you in a comment.</>,
    time: "1d", unread: false,
  },
]

function ItemMenu({ onDelete, muteLabel }: { onDelete: () => void; muteLabel: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button onClick={() => { setOpen(false); onDelete() }} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => setOpen(false)} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            <BellOff className="h-3.5 w-3.5" /> Turn off
          </button>
          <button onClick={() => setOpen(false)} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            <VolumeX className="h-3.5 w-3.5" /> {muteLabel}
          </button>
        </div>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(initialNotifs)
  const [headerMenu, setHeaderMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (headerRef.current && !headerRef.current.contains(e.target as Node)) setHeaderMenu(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  function remove(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id))
  }
  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, unread: false, highlight: false })))
    setHeaderMenu(false)
  }
  function loadMore() {
    setLoading(true)
    setTimeout(() => setLoading(false), 1200)
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f3f2ef] pb-16 lg:pb-6">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
        <div className="bg-white border border-gray-200 rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100">
            <h1 className="text-base font-bold text-gray-900">Notifications</h1>
            <div className="relative" ref={headerRef}>
              <button onClick={() => setHeaderMenu(!headerMenu)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <MoreHorizontal className="h-4.5 w-4.5" />
              </button>
              {headerMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button onClick={markAllRead} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    <Check className="h-4 w-4" /> Mark all read
                  </button>
                  <button onClick={() => setHeaderMenu(false)} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    <BellOff className="h-4 w-4" /> Push notifications
                  </button>
                  <button onClick={() => setHeaderMenu(false)} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                    <Bell className="h-4 w-4" /> Email notifications
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* List */}
          <div className="p-2">
            {notifs.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="h-9 w-9 text-gray-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">You&rsquo;re all caught up</p>
                <p className="text-xs text-gray-400 mt-1">No new notifications</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {notifs.map(n => (
                  <li key={n.id}>
                    <div className={`relative flex gap-3 rounded-xl p-3 transition-colors ${n.highlight ? "bg-gray-50" : n.unread ? "bg-brand/5" : "hover:bg-gray-50"}`}>
                      {/* Unread dot */}
                      {n.unread && !n.highlight && <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-brand" />}

                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {n.avatar ? (
                          <img src={n.avatar} alt="" className={`h-10 w-10 rounded-full object-cover ${n.blurAvatar ? "blur-[3px]" : ""}`} />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: n.initialsBg }}>
                            {n.initials}
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-sm text-gray-700 leading-snug">{n.body}</p>

                        {n.type === "connection" && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => remove(n.id)} className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">Accept</button>
                            <button onClick={() => remove(n.id)} className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-100 transition-colors">Delete</button>
                          </div>
                        )}
                        {n.type === "birthday" && (
                          <button className="mt-2 rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                            Say happy birthday 🎂
                          </button>
                        )}
                        {n.type === "premium" && (
                          <>
                            <a href="/membership" className="mt-2 inline-block rounded-lg border border-brand px-3 py-1 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors">
                              Try Premium Membership for ₹0
                            </a>
                            <p className="text-[11px] text-gray-400 mt-1">7-day free trial. Cancel anytime.</p>
                          </>
                        )}

                        <p className="text-[11px] text-gray-400 mt-1">{n.time}</p>
                      </div>

                      {/* Per-item menu */}
                      <div className="absolute right-2 top-2">
                        <ItemMenu onDelete={() => remove(n.id)} muteLabel="Mute notification" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="border-t border-gray-100 p-3">
              <button
                onClick={loadMore}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand/10 py-2.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white transition-colors disabled:opacity-70"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</> : "Load more notifications"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <a href="/compose" className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </a>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <a href="/messages" className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></a>
        </div>
      </nav>
    </div>
  )
}
