"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import Image from "next/image"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { realtimeTokenAction } from "@/app/(main)/messages/actions"
import {
  Search, Users, Calendar, Bell, MessageSquareText, Settings,
  Award, Star, UserPlus, Zap, HelpCircle, Power, CreditCard,
  FileText, UsersRound, Building2, Clock, TrendingUp, ChevronRight,
  ArrowUpRight,
} from "lucide-react"

/* ---------------- Membership system ----------------
 * The membership button supports all 6 tiers (colors match the
 * AlumniProfileCard stripes). Upgrade flow:
 *   student -> associate -> premium -> life
 * Committee and Life members cannot upgrade.
 */
type MembershipTier = "student" | "associate" | "premium" | "life" | "inactive" | "committee"

import { MEMBERSHIP_TIERS } from "@/config/membership-colors"

const MEMBERSHIP_META: Record<MembershipTier, {
  label: string
  style: React.CSSProperties
  textClass: string
  next: MembershipTier | null
}> = Object.fromEntries(
  (Object.entries(MEMBERSHIP_TIERS) as [MembershipTier, typeof MEMBERSHIP_TIERS[MembershipTier]][]).map(
    ([tier, meta]) => [
      tier,
      {
        label: meta.label,
        style: { background: meta.background },
        textClass: meta.textClass,
        next: meta.next,
      },
    ],
  ),
) as Record<MembershipTier, { label: string; style: React.CSSProperties; textClass: string; next: MembershipTier | null }>

export type NavbarViewer = {
  name: string
  batch: string
  avatar: string
  membership: MembershipTier
  username: string
}

const FALLBACK_VIEWER: NavbarViewer = {
  name: "Guest",
  batch: "—",
  avatar: "https://ui-avatars.com/api/?name=Guest",
  membership: "associate",
  username: "",
}

/* ---------------- Search scopes (Quora-style) ---------------- */
const SEARCH_SCOPES = [
  { key: "profiles", label: "Profiles", icon: Users, href: "/community" },
  { key: "posts", label: "Posts", icon: FileText, href: "/feed" },
  { key: "groups", label: "Groups", icon: UsersRound, href: "/groups" },
  { key: "events", label: "Events", icon: Calendar, href: "/events" },
  { key: "businesses", label: "Businesses", icon: Building2, href: "/business" },
]

const SUGGESTED_SEARCHES = [
  { text: "Alumni Reunion 2026", trending: true },
  { text: "Batch 2010 memories", trending: false },
  { text: "Mentorship program", trending: true },
  { text: "JNV Nagpur campus", trending: false },
  { text: "Karma leaderboard", trending: false },
]

function notifTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

/* ---------------- Hooks ---------------- */
function useClickOutside<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])
  return ref
}

/* ---------------- Search panel (shared desktop + mobile) ---------------- */
function SearchPanel({ query }: { query: string }) {
  return (
    <div className="overflow-hidden rounded-[5px] border border-gray-200 bg-white shadow-lg">
      {query.trim() ? (
        <>
          {/* Quora-style scoped search */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Search options</p>
          </div>
          <ul className="pb-2">
            {SEARCH_SCOPES.map(scope => (
              <li key={scope.key}>
                <a
                  href={`${scope.href}?q=${encodeURIComponent(query.trim())}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                >
                  <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">
                    Search <span className="font-semibold text-gray-900">&ldquo;{query.trim()}&rdquo;</span>{" "}
                    <span className="text-gray-400">in</span>{" "}
                    <span className="font-medium text-brand">{scope.label}</span>
                  </span>
                  <scope.icon className="ml-auto h-4 w-4 text-gray-300 group-hover:text-brand flex-shrink-0 transition-colors" />
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {/* Suggested searches */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Suggested searches</p>
          </div>
          <ul className="pb-2">
            {SUGGESTED_SEARCHES.map((s, i) => (
              <li key={i}>
                <a
                  href={`/community?q=${encodeURIComponent(s.text)}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  {s.trending
                    ? <TrendingUp className="h-3.5 w-3.5 text-brand flex-shrink-0" />
                    : <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
                  <span className="text-sm text-gray-700">{s.text}</span>
                  {s.trending && <span className="ml-auto rounded-[3px] bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">Trending</span>}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/* ---------------- Membership button ---------------- */
function MembershipButton({ tier }: { tier: MembershipTier }) {
  const meta = MEMBERSHIP_META[tier]
  const canUpgrade = meta.next !== null
  const nextMeta = meta.next ? MEMBERSHIP_META[meta.next] : null

  return (
    <div className="space-y-1.5">
      <a
        href="/membership"
        className={`block w-full rounded-[4px] px-3 py-2 text-center text-xs font-bold shadow-sm transition-transform hover:scale-[1.02] ${meta.textClass}`}
        style={meta.style}
      >
        You&rsquo;ve {meta.label} Membership
      </a>
      {canUpgrade && nextMeta ? (
        <a
          href={`/upgrade/${meta.next}`}
          className="flex items-center justify-center gap-1 w-full rounded-[4px] border border-dashed border-gray-300 px-3 py-1.5 text-[11px] font-semibold text-gray-500 hover:border-brand hover:text-brand transition-colors"
        >
          Upgrade to {nextMeta.label} <ArrowUpRight className="h-3 w-3" />
        </a>
      ) : (
        <p className="text-center text-[10px] text-gray-400">
          {tier === "committee" ? "Committee membership — highest honour" : "Lifetime membership — nothing above this"}
        </p>
      )}
    </div>
  )
}

/* ---------------- Private Navbar ---------------- */
export function PrivateNavbar({ viewer }: { viewer?: NavbarViewer | null } = {}) {
  const currentUser = viewer ?? FALLBACK_VIEWER
  const profileHref = currentUser.username ? `/${currentUser.username}` : "/profile/edit"
  const pathname = usePathname()
  const [query, setQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  type NotifItem = {
    id: string
    title: string
    body: string | null
    imageUrl: string | null
    isRead: boolean
    createdAt: string
    href: string
    ctas?: { label: string; href: string; primary?: boolean }[]
  }
  const [notifCount, setNotifCount] = useState(0)
  const [notifItems, setNotifItems] = useState<NotifItem[]>([])
  const [msgCount, setMsgCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications/summary")
      if (!r.ok) return
      const d = await r.json()
      setNotifCount(d.count ?? 0)
      setNotifItems(d.items ?? [])
    } catch {
      /* ignore — retried next tick */
    }
  }, [])

  // Unread-DM badge count. Hidden while on /messages (you're reading them there).
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  const loadMsg = useCallback(async () => {
    if (pathnameRef.current.startsWith("/messages")) {
      setMsgCount(0)
      return
    }
    try {
      const r = await fetch("/api/messages/unread")
      if (!r.ok) return
      const d = await r.json()
      setMsgCount(d.count ?? 0)
    } catch {
      /* ignore — retried next tick */
    }
  }, [])

  // Initial load + a slow safety-net poll (5 min). Instant updates come from the
  // realtime subscription below; this only backstops a dropped channel.
  useEffect(() => {
    load()
    loadMsg()
    const id = setInterval(() => { load(); loadMsg() }, 5 * 60_000)
    return () => clearInterval(id)
  }, [load, loadMsg])

  // Clear/refresh the DM badge when navigating in or out of /messages, and
  // refresh it when the tab regains focus.
  useEffect(() => {
    loadMsg()
    const onFocus = () => loadMsg()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [pathname, loadMsg])

  // Realtime: subscribe to this user's private channel and refetch the bell +
  // DM badge the moment a notification is broadcast — no poll lag. A new DM
  // fires a "notification", so the Messages badge updates live too. Reuses the
  // messaging realtime infra (token → setAuth → private user:{id} channel).
  useEffect(() => {
    const supabase = getSupabaseBrowser()
    let cancelled = false
    let channel: RealtimeChannel | null = null
    ;(async () => {
      const auth = await realtimeTokenAction()
      if (!auth || cancelled) return
      await supabase.realtime.setAuth(auth.token)
      channel = supabase.channel(`user:${auth.userId}`, { config: { private: true } })
      channel.on("broadcast", { event: "notification" }, () => { load(); loadMsg() })
      channel.subscribe()
    })()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [load, loadMsg])

  function markOne(id: string, wasRead: boolean) {
    if (wasRead) return
    setNotifItems((items) => items.map((i) => (i.id === id ? { ...i, isRead: true } : i)))
    setNotifCount((c) => Math.max(0, c - 1))
    void fetch("/api/notifications/summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  async function clearNotifs() {
    setNotifCount(0)
    setNotifItems((items) => items.map((i) => ({ ...i, isRead: true })))
    try {
      await fetch("/api/notifications/summary", { method: "POST" })
    } catch {
      /* best-effort */
    }
  }

  const searchRef = useClickOutside<HTMLDivElement>(() => setSearchOpen(false))
  const notifRef = useClickOutside<HTMLLIElement>(() => setNotifOpen(false))
  const profileRef = useClickOutside<HTMLLIElement>(() => setProfileOpen(false))

  const iconLinks = [
    // Network hidden for now — page/data still being figured out. Restore when ready.
    // { href: "/network", icon: Network, label: "Network" },
    { href: "/community", icon: Users, label: "Community" },
    { href: "/events", icon: Calendar, label: "Events" },
    { href: "/messages", icon: MessageSquareText, label: "Messages" },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <nav className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:px-6">

        {/* Logo */}
        <a href="/feed" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-gradient-to-br from-brand to-brand-700 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3">
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="hidden md:inline text-sm font-bold text-gray-900 group-hover:text-brand transition-colors">NNAWCA</span>
        </a>

        {/* Search — grows to the right on focus (desktop) */}
        <div ref={searchRef} className="relative hidden sm:block ml-2">
          <div
            className={`relative transition-all duration-300 ease-out ${searchOpen ? "w-[300px] md:w-[420px] lg:w-[480px]" : "w-44 md:w-64"}`}
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search…"
              className="w-full rounded-[3px] border border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10 transition-colors"
            />
          </div>
          {searchOpen && (
            <div className="absolute left-0 top-full mt-2 w-[300px] md:w-[420px] lg:w-[480px] z-50">
              <SearchPanel query={query} />
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Upgrade CTA — shows the NEXT tier for the viewer (student→associate,
            associate→premium, premium→life). Hidden for life/committee, whose
            `next` is null (nothing above). Same flow as the dropdown button. */}
        {(() => {
          const next = MEMBERSHIP_META[currentUser.membership]?.next
          if (!next) return null
          return (
            <a
              href={`/upgrade/${next}`}
              className="hidden lg:flex items-center gap-1.5 rounded-[3px] border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-3.5 py-1.5 text-xs font-bold text-amber-700 hover:from-amber-100 hover:to-yellow-100 hover:border-amber-300 transition-all flex-shrink-0"
            >
              <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              Upgrade to {MEMBERSHIP_META[next].label}
            </a>
          )
        })()}

        {/* Right icon nav */}
        <ul className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

          {/* Mobile: search */}
          <li className="sm:hidden">
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className={`flex h-9 w-9 items-center justify-center rounded-[3px] transition-colors ${mobileSearchOpen ? "bg-brand text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              <Search className="h-4 w-4" />
            </button>
          </li>

          {/* Mobile: membership */}
          <li className="lg:hidden">
            <a href="/membership" className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
              <CreditCard className="h-4 w-4" />
            </a>
          </li>

          {/* Icon links (hidden on small mobile — bottom nav covers them) */}
          {iconLinks.map(item => {
            const active = pathname.startsWith(item.href)
            const badge = item.href === "/messages" ? msgCount : 0
            return (
              <li key={item.href} className="hidden md:block">
                <a
                  href={item.href}
                  title={item.label}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-[3px] transition-colors ${active ? "bg-brand text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}
                >
                  <item.icon className="h-4 w-4" />
                  {badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </a>
              </li>
            )
          })}

          {/* Notifications */}
          <li className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
              className={`relative flex h-9 w-9 items-center justify-center rounded-[3px] transition-colors ${notifOpen ? "bg-brand text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-[320px] max-w-[calc(100vw-1rem)] sm:w-[360px] rounded-[5px] border border-gray-200 bg-white shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h6 className="text-sm font-semibold text-gray-900">Your Notifications</h6>
                  {notifCount > 0 && (
                    <button onClick={clearNotifs} className="text-xs text-brand hover:underline">Mark all read</button>
                  )}
                </div>
                <ul className="max-h-[320px] overflow-y-auto p-2">
                  {notifItems.length === 0 ? (
                    <li className="px-3 py-8 text-center text-xs text-gray-400">You&apos;re all caught up.</li>
                  ) : (
                    notifItems.map(n => (
                      <li key={n.id}>
                        <div className={`rounded-[4px] p-2.5 transition-colors ${n.isRead ? "" : "bg-brand-50/40"}`}>
                          <a href={n.href} onClick={() => markOne(n.id, n.isRead)} className="flex items-start gap-3 rounded-[3px] hover:opacity-90">
                            {n.imageUrl ? (
                              <Image src={n.imageUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-[4px] object-cover flex-shrink-0" />
                            ) : (
                              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[4px] bg-brand/10 text-brand"><Bell className="h-4 w-4" /></span>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 leading-snug">{n.title}</p>
                              {n.body && <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{n.body}</p>}
                            </div>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">{notifTime(n.createdAt)}</span>
                          </a>
                          {n.ctas && n.ctas.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5 pl-12">
                              {n.ctas.map((c) => (
                                <a
                                  key={c.label + c.href}
                                  href={c.href}
                                  onClick={() => markOne(n.id, n.isRead)}
                                  className={
                                    c.primary
                                      ? "rounded-[3px] bg-brand px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-600"
                                      : "rounded-[3px] border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                                  }
                                >
                                  {c.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
                <div className="border-t border-gray-100 p-2.5 text-center">
                  <a href="/notifications" className="inline-block rounded-[3px] bg-brand/10 px-4 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors">
                    See all Logs
                  </a>
                </div>
              </div>
            )}
          </li>

          {/* Profile dropdown */}
          <li className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[4px] ring-1 ring-gray-200 hover:ring-brand transition-all"
            >
              <Image src={currentUser.avatar} alt={currentUser.name} width={36} height={36} className="h-full w-full object-cover" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-[280px] rounded-[5px] border border-gray-200 bg-white shadow-xl overflow-hidden">
                {/* Profile info */}
                <div className="p-4 pb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <Image src={currentUser.avatar} alt="" width={44} height={44} className="h-11 w-11 rounded-[4px] object-cover" />
                    <div className="min-w-0">
                      <a href={profileHref} className="text-sm font-bold text-gray-900 hover:text-brand transition-colors block truncate">
                        {currentUser.name}
                      </a>
                      <p className="text-xs text-gray-500">{currentUser.batch}</p>
                    </div>
                  </div>

                  <a
                    href={profileHref}
                    className="block w-full rounded-[4px] bg-brand/10 px-3 py-2 text-center text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors mb-2"
                  >
                    View Your Profile
                  </a>

                  {/* Membership button — all 6 tier colours, upgrade flow enforced */}
                  <MembershipButton tier={currentUser.membership} />
                </div>

                <hr className="border-gray-100" />

                {/* Links */}
                <ul className="py-1.5">
                  {[
                    { icon: FileText, label: "Drafts", href: "/compose/drafts" },
                    { icon: Award, label: "Achievements", href: "/achievements" },
                    { icon: Star, label: "Karma Points", href: "/karma" },
                    { icon: UserPlus, label: "Refer an Alumni", href: "/refer" },
                    { icon: Zap, label: "Try NNAWCA Pro", href: "https://www.nnawca.com/pro", external: true },
                    { icon: Settings, label: "Settings & Privacy", href: "/settings" },
                    { icon: HelpCircle, label: "Help and Support", href: "/help" },
                  ].map(item => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        <item.icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>

                <hr className="border-gray-100" />

                <div className="py-1.5">
                  <button
                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Power className="h-4 w-4 flex-shrink-0" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </li>
        </ul>
      </nav>

      {/* Mobile search panel */}
      {mobileSearchOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white p-3">
          <div className="relative mb-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search NNAWCA…"
              className="w-full rounded-[3px] border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
            />
          </div>
          <SearchPanel query={query} />
        </div>
      )}
    </header>
  )
}
