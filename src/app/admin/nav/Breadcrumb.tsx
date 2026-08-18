"use client"

import { usePathname } from "next/navigation"
import { CaretRight } from "@phosphor-icons/react"
import { activeSection, itemActive, type NavSection } from "./nav-config"

/**
 * `Section › Page` trail derived from nav-config. Nested detail routes
 * (e.g. /admin/users/123) resolve to their parent item via prefix match.
 */
export default function Breadcrumb({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname()
  const section = activeSection(sections, pathname)
  if (!section) return null

  // itemActive matches exact + prefix, so detail routes (/admin/users/123)
  // resolve to their parent item. Pick the longest match if items nest.
  let current: NavSection["items"][number] | undefined
  for (const i of section.items) {
    if (itemActive(i.href, pathname) && (!current || i.href.length > current.href.length)) current = i
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs md:flex">
      <span className="text-zinc-500">{section.label}</span>
      {current && (
        <>
          <CaretRight className="h-3 w-3 text-zinc-600" weight="bold" />
          <span className="font-medium text-zinc-200">{current.label}</span>
        </>
      )}
    </nav>
  )
}
