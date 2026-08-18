"use client"

import { useEffect, useState } from "react"
import { X } from "@phosphor-icons/react"
import type { Badges, NavSection } from "./nav/nav-config"
import Topbar from "./nav/Topbar"
import PrimaryRail from "./nav/PrimaryRail"
import SecondarySidebar from "./nav/SecondarySidebar"
import CommandPalette from "./nav/CommandPalette"
import { ToastProvider } from "./admin-ui"

export interface AdminIdentity {
  name: string
  email: string
  initials: string
}

/**
 * Two-level console shell: full-width Topbar, then a flex row of the icon-only
 * PrimaryRail + the SecondarySidebar (items of the active section) + page
 * content. All nav data comes pre-filtered (role-scoped) from the layout — this
 * component holds no business logic, only the mobile-drawer toggle.
 */
export default function AdminShell({
  admin,
  env,
  sections,
  badges,
  children,
}: {
  admin: AdminIdentity
  env: string
  sections: NavSection[]
  badges: Badges
  children: React.ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Global ⌘K / Ctrl+K toggle — lives here (always mounted) so it works while
  // the palette is closed. The palette itself only mounts when open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <ToastProvider>
    <div className="flex h-[100dvh] flex-col bg-gray-50">
      <Topbar admin={admin} env={env} onMenuClick={() => setDrawerOpen(true)} onSearchClick={() => setPaletteOpen(true)} sections={sections} />

      <div className="flex min-h-0 flex-1">
        <PrimaryRail sections={sections} badges={badges} />

        {/* Secondary sidebar — desktop */}
        <aside className="hidden lg:block">
          <SecondarySidebar sections={sections} badges={badges} />
        </aside>

        {/* Secondary sidebar — mobile drawer */}
        {drawerOpen && (
          <>
            <div role="presentation" className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setDrawerOpen(false)} />
            <aside className="fixed left-0 top-0 z-50 h-full lg:hidden">
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute -right-10 top-4 rounded-[3px] bg-white/10 p-1.5 text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SecondarySidebar sections={sections} badges={badges} onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">{children}</main>
      </div>

      {paletteOpen && <CommandPalette sections={sections} onClose={() => setPaletteOpen(false)} />}
    </div>
    </ToastProvider>
  )
}
