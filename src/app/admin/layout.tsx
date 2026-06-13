"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, ShieldCheck, Flag, CalendarDays,
  UsersRound, CreditCard, Sparkles, Settings, Menu, X, Search,
  Bell, ChevronDown, BarChart3, Briefcase, Building2, Gamepad2,
  Trophy, MessagesSquare, Megaphone, ScrollText, LogOut,
  ExternalLink, ChevronRight, Landmark, Palette,
} from "lucide-react"

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

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
      { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="h-4.5 w-4.5" />, soon: true },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/admin/users", label: "Users", icon: <Users className="h-4.5 w-4.5" /> },
      { href: "/admin/verification", label: "Verification", icon: <ShieldCheck className="h-4.5 w-4.5" />, badge: 12 },
      { href: "/admin/groups", label: "Groups", icon: <UsersRound className="h-4.5 w-4.5" /> },
      { href: "/admin/events", label: "Events", icon: <CalendarDays className="h-4.5 w-4.5" /> },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/moderation", label: "Moderation", icon: <Flag className="h-4.5 w-4.5" />, badge: 7 },
      { href: "/admin/notifications", label: "Announcements", icon: <Megaphone className="h-4.5 w-4.5" />, soon: true },
    ],
  },
  {
    title: "Revenue",
    items: [
      { href: "/admin/membership", label: "Membership", icon: <CreditCard className="h-4.5 w-4.5" /> },
      { href: "/admin/businesses", label: "Businesses", icon: <Building2 className="h-4.5 w-4.5" />, soon: true },
      { href: "/admin/jobs", label: "Job Board", icon: <Briefcase className="h-4.5 w-4.5" />, soon: true },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/admin/karma", label: "Karma System", icon: <Sparkles className="h-4.5 w-4.5" /> },
      { href: "/admin/themes", label: "Chat Themes", icon: <Palette className="h-4.5 w-4.5" /> },
      { href: "/admin/rewards", label: "Badges & Rewards", icon: <Trophy className="h-4.5 w-4.5" />, soon: true },
      { href: "/admin/games", label: "Games", icon: <Gamepad2 className="h-4.5 w-4.5" />, soon: true },
      { href: "/admin/messaging", label: "Messaging", icon: <MessagesSquare className="h-4.5 w-4.5" />, soon: true },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: <Settings className="h-4.5 w-4.5" /> },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: <ScrollText className="h-4.5 w-4.5" />, soon: true },
    ],
  },
]

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10 flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
          <Landmark className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">The Parliament</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">Admin Console</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map(group => (
          <div key={group.title}>
            <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map(item => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                          : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <span className={active ? "text-indigo-400" : "text-slate-500"}>{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white min-w-[18px] text-center">{item.badge}</span>
                      )}
                      {item.soon && (
                        <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">Soon</span>
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
      <div className="border-t border-white/10 p-3 flex-shrink-0 space-y-1">
        <a href="/feed" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          <ExternalLink className="h-4 w-4 text-slate-500" /> View Live Site
        </a>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors">
          <LogOut className="h-4 w-4 text-slate-500" /> Sign Out
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar — mobile offcanvas */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 -right-10 rounded-full bg-white/10 p-1.5 text-white">
          <X className="h-5 w-5" />
        </button>
        <SidebarContent pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Sidebar — desktop fixed */}
      <aside className="hidden lg:block fixed top-0 left-0 z-30 h-full w-64 bg-slate-900">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Main */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600">
            <Menu className="h-5 w-5" />
          </button>

          {/* Global search */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search users, posts, events..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div className="flex-1 sm:hidden" />

          <div className="flex items-center gap-2">
            <button className="sm:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <Search className="h-5 w-5" />
            </button>
            <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>

            {/* Profile */}
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">SA</div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">Super Admin</p>
                  <p className="text-[10px] text-slate-400">admin@nnawca.org</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <a href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <Settings className="h-4 w-4" /> Admin Settings
                  </a>
                  <a href="/feed" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <ExternalLink className="h-4 w-4" /> View Live Site
                  </a>
                  <div className="my-1 border-t border-slate-100" />
                  <button onClick={() => setProfileOpen(false)} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>

        <footer className="px-6 py-4 text-center text-[11px] text-slate-400 border-t border-slate-200">
          NNAWCA Admin Console · The Parliament Platform
        </footer>
      </div>
    </div>
  )
}
