"use client"

import { usePathname } from "next/navigation"
import { Home, Users, PlusSquare, Calendar, MessageSquareText } from "lucide-react"

// Mobile app-style bottom tab bar. Hidden ≥lg (desktop uses the top icon nav).
// The top navbar hides its directory/events/messages icons on small screens and
// assumes this bar covers them. Respects iOS safe-area inset.
const TABS = [
  { href: "/feed", icon: Home, label: "Home" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/compose", icon: PlusSquare, label: "Post", center: true },
  { href: "/events", icon: Calendar, label: "Events" },
  { href: "/messages", icon: MessageSquareText, label: "Chat" },
]

export function MobileTabBar() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map((tab) => {
          // "/feed" must not match every path; exact-or-subpath per tab.
          const active =
            tab.href === "/feed"
              ? pathname === "/feed" || pathname.startsWith("/feed/")
              : pathname.startsWith(tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <a
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  active ? "text-brand" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.center ? (
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors ${
                      active ? "bg-brand text-white" : "bg-brand/10 text-brand"
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                  </span>
                ) : (
                  <tab.icon className="h-5 w-5" />
                )}
                <span>{tab.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
