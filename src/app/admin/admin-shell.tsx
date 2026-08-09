"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogoMark } from "@/components/shared/Logo"
import {
  House, ChartBar, Users, ShieldCheck, UsersThree, CalendarDots,
  Flag, Megaphone, CreditCard, Storefront, Briefcase, Sparkle,
  Palette, Trophy, GameController, ChatsCircle, Gear, Scroll,
  List, X, MagnifyingGlass, Bell, CaretDown, SignOut,
  ArrowSquareOut, VideoCamera,
} from "@phosphor-icons/react"

export interface AdminIdentity {
  name: string
  email: string
  initials: string
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string | number
  soon?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const ICON = "h-4.5 w-4.5"

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: <House className={ICON} weight="duotone" color="#3b82f6" /> },
      { href: "/admin/analytics", label: "Analytics", icon: <ChartBar className={ICON} weight="duotone" color="#3b82f6" />, soon: true },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/admin/users", label: "Users", icon: <Users className={ICON} weight="duotone" color="#3b82f6" /> },
      { href: "/admin/verification", label: "Verification", icon: <ShieldCheck className={ICON} weight="duotone" color="#3b82f6" />, badge: 12 },
      { href: "/admin/groups", label: "Groups", icon: <UsersThree className={ICON} weight="duotone" color="#3b82f6" /> },
      { href: "/admin/events", label: "Events", icon: <CalendarDots className={ICON} weight="duotone" color="#0ea5e9" /> },
      { href: "/admin/ama", label: "AMA Sessions", icon: <VideoCamera className={ICON} weight="duotone" color="#0ea5e9" /> },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/moderation", label: "Moderation", icon: <Flag className={ICON} weight="duotone" color="#f43f5e" />, badge: 7 },
      { href: "/admin/notifications", label: "Announcements", icon: <Megaphone className={ICON} weight="duotone" color="#f43f5e" />, soon: true },
    ],
  },
  {
    title: "Revenue",
    items: [
      { href: "/admin/membership", label: "Membership", icon: <CreditCard className={ICON} weight="duotone" color="#8b5cf6" /> },
      { href: "/admin/businesses", label: "Businesses", icon: <Storefront className={ICON} weight="duotone" color="#8b5cf6" />, soon: true },
      { href: "/admin/jobs", label: "Job Board", icon: <Briefcase className={ICON} weight="duotone" color="#8b5cf6" />, soon: true },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/admin/karma", label: "Karma System", icon: <Sparkle className={ICON} weight="duotone" color="#f59e0b" /> },
      { href: "/admin/themes", label: "Chat Themes", icon: <Palette className={ICON} weight="duotone" color="#f59e0b" /> },
      { href: "/admin/rewards", label: "Badges & Rewards", icon: <Trophy className={ICON} weight="duotone" color="#f59e0b" />, soon: true },
      { href: "/admin/games", label: "Games", icon: <GameController className={ICON} weight="duotone" color="#10b981" />, soon: true },
      { href: "/admin/messaging", label: "Messaging", icon: <ChatsCircle className={ICON} weight="duotone" color="#10b981" />, soon: true },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: <Gear className={ICON} weight="duotone" color="#71717a" /> },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: <Scroll className={ICON} weight="duotone" color="#71717a" />, soon: true },
    ],
  },
]

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-zinc-800 flex-shrink-0">
        <LogoMark className="h-8 w-8" />
        <div>
          <p className="text-sm font-bold text-zinc-100 leading-tight">NNAWCA</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">Admin Console</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map(group => (
          <div key={group.title}>
            <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map(item => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={onNavigate}
                      className={`relative flex items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-blue-950/40 text-zinc-100"
                          : item.soon
                            ? "text-zinc-600 hover:text-zinc-100 hover:bg-zinc-900"
                            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                      }`}
                    >
                      {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-[3px] bg-blue-500" />}
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="rounded-[3px] bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white min-w-[18px] text-center">{item.badge}</span>
                      )}
                      {item.soon && (
                        <span className="rounded-[3px] bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">Soon</span>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 p-3 flex-shrink-0 space-y-1">
        <Link href="/feed" className="flex items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-[13px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors">
          <ArrowSquareOut className="h-4 w-4 text-zinc-600" /> View Live Site
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-[13px] font-medium text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
        >
          <SignOut className="h-4 w-4 text-zinc-600" /> Sign Out
        </button>
      </div>
    </div>
  )
}

function findActiveLabels(pathname: string): { section: string; page: string } {
  for (const group of NAV) {
    for (const item of group.items) {
      const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
      if (active) return { section: group.title, page: item.label }
    }
  }
  return { section: "Admin", page: "Console" }
}

export default function AdminShell({
  admin,
  children,
}: {
  admin: AdminIdentity
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { section, page } = findActiveLabels(pathname)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Mobile overlay */}
      {sidebarOpen && <div role="presentation" className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar — mobile offcanvas */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[220px] transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 -right-10 rounded-[3px] bg-white/10 p-1.5 text-white">
          <X className="h-5 w-5" />
        </button>
        <SidebarContent pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Sidebar — desktop fixed */}
      <aside className="hidden lg:block fixed top-0 left-0 z-30 h-full w-[220px] border-r border-zinc-800">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Main */}
      <div className="lg:pl-[220px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-zinc-800 bg-[#0a0a0a] flex items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-[3px] hover:bg-zinc-900 text-zinc-400">
            <List className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1.5 text-sm">
            <span className="text-zinc-500">{section}</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-100 font-medium">{page}</span>
          </div>

          <div className="flex-1" />

          {/* Search affordance (non-functional) */}
          <button className="hidden sm:flex items-center gap-2 rounded-[3px] border border-zinc-800 bg-[#111113] px-3 py-1.5 text-sm text-zinc-500 hover:border-zinc-700 transition-colors w-56">
            <MagnifyingGlass className="h-4 w-4" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-[10px] font-mono text-zinc-600 border border-zinc-800 rounded-[3px] px-1 py-0.5">⌘K</kbd>
          </button>
          <button className="sm:hidden p-2 rounded-[3px] hover:bg-zinc-900 text-zinc-500">
            <MagnifyingGlass className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-[3px] hover:bg-zinc-900 text-zinc-500">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-[3px] bg-rose-500" />
            </button>

            {/* Profile */}
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-[3px] px-2 py-1.5 hover:bg-zinc-900 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-blue-600 text-xs font-bold text-white">{admin.initials}</div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-zinc-100 leading-tight">{admin.name}</p>
                  <p className="text-[10px] text-zinc-500">{admin.email}</p>
                </div>
                <CaretDown className="h-3.5 w-3.5 text-zinc-500 hidden md:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-[3px] border border-zinc-800 bg-[#111113] py-1 shadow-lg">
                  <a href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
                    <Gear className="h-4 w-4" /> Admin Settings
                  </a>
                  <Link href="/feed" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
                    <ArrowSquareOut className="h-4 w-4" /> View Live Site
                  </Link>
                  <div className="my-1 border-t border-zinc-800" />
                  <button
                    onClick={() => { setProfileOpen(false); signOut({ callbackUrl: "/auth/signin" }) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10"
                  >
                    <SignOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 bg-[#0a0a0a]">{children}</main>

        <footer className="px-6 py-4 text-center text-[11px] text-zinc-600 border-t border-zinc-800">
          NNAWCA Admin Console · NNAWCA Platform
        </footer>
      </div>
    </div>
  )
}
