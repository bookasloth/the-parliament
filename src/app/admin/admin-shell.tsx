"use client"

import { useState } from "react"
import { X } from "@phosphor-icons/react"
import type { NavSection } from "./nav/nav-config"
import Topbar from "./nav/Topbar"
import PrimaryRail from "./nav/PrimaryRail"
import SecondarySidebar from "./nav/SecondarySidebar"

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
  children,
}: {
  admin: AdminIdentity
  env: string
  sections: NavSection[]
  children: React.ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-[100dvh] flex-col bg-[#0a0a0a]">
      <Topbar admin={admin} env={env} onMenuClick={() => setDrawerOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <PrimaryRail sections={sections} />

        {/* Secondary sidebar — desktop */}
        <aside className="hidden lg:block">
          <SecondarySidebar sections={sections} />
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
              <SecondarySidebar sections={sections} onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto bg-[#0a0a0a] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
