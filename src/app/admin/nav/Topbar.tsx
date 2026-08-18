"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  List, MagnifyingGlass, Bell, CaretDown, SignOut, Gear, ArrowSquareOut, Question,
} from "@phosphor-icons/react"
import { LogoMark } from "@/components/shared/Logo"
import type { AdminIdentity } from "../admin-shell"
import { guideForPath } from "../help/guides"
import type { NavSection } from "./nav-config"
import Breadcrumb from "./Breadcrumb"

const ENV_STYLE: Record<string, string> = {
  Production: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Preview: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  Local: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
}

export default function Topbar({
  admin,
  env,
  onMenuClick,
  onSearchClick,
  sections,
}: {
  admin: AdminIdentity
  env: string
  onMenuClick: () => void
  onSearchClick: () => void
  sections: NavSection[]
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  function openHelp() {
    const guide = guideForPath(pathname)
    router.push(guide ? `/admin/help#${guide.slug}` : "/admin/help")
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center gap-3 border-b border-zinc-800 bg-[#0a0a0a] px-4 sm:px-6">
      {/* Mobile: open secondary drawer */}
      <button
        onClick={onMenuClick}
        className="rounded-[3px] p-2 text-zinc-400 hover:bg-zinc-900 lg:hidden"
        aria-label="Open menu"
      >
        <List className="h-5 w-5" />
      </button>

      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <LogoMark className="h-8 w-8" />
        <div className="hidden sm:block">
          <p className="text-sm font-bold leading-tight text-zinc-100">NNAWCA</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">Admin Console</p>
        </div>
      </div>

      {/* Breadcrumb: Section › Page */}
      <div className="ml-2 hidden md:block">
        <Breadcrumb sections={sections} />
      </div>

      <div className="flex-1" />

      {/* Search affordance → opens the command palette */}
      <button
        onClick={onSearchClick}
        className="hidden w-56 items-center gap-2 rounded-[3px] border border-zinc-800 bg-[#111113] px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-zinc-700 sm:flex"
      >
        <MagnifyingGlass className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="rounded-[3px] border border-zinc-800 px-1 py-0.5 font-mono text-[10px] text-zinc-600">⌘K</kbd>
      </button>
      <button onClick={onSearchClick} className="rounded-[3px] p-2 text-zinc-500 hover:bg-zinc-900 sm:hidden" aria-label="Search">
        <MagnifyingGlass className="h-5 w-5" />
      </button>

      {/* Environment badge */}
      <span className={`hidden rounded-[3px] border px-2 py-1 text-[10px] font-bold uppercase tracking-wider md:inline-block ${ENV_STYLE[env] ?? ENV_STYLE.Local}`}>
        {env}
      </span>

      {/* Context help — jumps to the guide for the current page */}
      <button
        onClick={openHelp}
        className="rounded-[3px] p-2 text-zinc-500 hover:bg-zinc-900"
        aria-label="Help for this page"
        title="Help for this page"
      >
        <Question className="h-5 w-5" />
      </button>

      {/* Notifications */}
      <button className="relative rounded-[3px] p-2 text-zinc-500 hover:bg-zinc-900" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-[3px] bg-rose-500" />
      </button>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-2 rounded-[3px] px-2 py-1.5 transition-colors hover:bg-zinc-900"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-blue-600 text-xs font-bold text-white">{admin.initials}</div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-semibold leading-tight text-zinc-100">{admin.name}</p>
            <p className="text-[10px] text-zinc-500">{admin.email}</p>
          </div>
          <CaretDown className="hidden h-3.5 w-3.5 text-zinc-500 md:block" />
        </button>
        {profileOpen && (
          <>
            <div role="presentation" className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-[3px] border border-zinc-800 bg-[#111113] py-1 shadow-lg">
              <Link href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
                <Gear className="h-4 w-4" /> Admin Settings
              </Link>
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
          </>
        )}
      </div>
    </header>
  )
}
