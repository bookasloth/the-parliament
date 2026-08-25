"use client"

import { usePathname } from "next/navigation"

/**
 * Games section frame. On a live Vyapaar match route the board takes the full width
 * (no profile rail, no guide rail); every other games page keeps the two-rail layout.
 * The rails are passed in as already-rendered server components.
 */
export function GamesFrame({ rail, guide, children }: { rail: React.ReactNode; guide: React.ReactNode; children: React.ReactNode }) {
  const path = usePathname() ?? ""
  const fullBleed = /\/games\/vyapaar\/matches\//.test(path)

  if (fullBleed) {
    return <div className="mx-auto max-w-[1700px] px-2 py-3 sm:px-4">{children}</div>
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="hidden w-[280px] flex-shrink-0 lg:block">
          <div className="sticky top-20">{rail}</div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
        <aside className="hidden w-[300px] flex-shrink-0 xl:block">
          <div className="sticky top-20">{guide}</div>
        </aside>
      </div>
    </div>
  )
}
