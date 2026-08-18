"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { MagnifyingGlass } from "@phosphor-icons/react"
import type { NavSection } from "./nav-config"
import { ICONS } from "./icon-map"

interface Entry {
  label: string
  href: string
  icon: string
  section: string
}

/**
 * ⌘K / Ctrl+K command palette. Mounted only while open (admin-shell owns the
 * global toggle keydown so ⌘K works when the palette is closed), so its state
 * resets fresh on each open. Flattens the role-scoped `sections` into a
 * filterable, keyboard-drivable list.
 */
export default function CommandPalette({
  sections,
  onClose,
}: {
  sections: NavSection[]
  onClose: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const entries = useMemo<Entry[]>(
    () => sections.flatMap(s => s.items.map(i => ({ label: i.label, href: i.href, icon: i.icon, section: s.label }))),
    [sections],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(e => (e.label + " " + e.section).toLowerCase().includes(q))
  }, [entries, query])

  // Clamp selection at read time (results shrink as the query narrows) — no effect needed.
  const active = Math.min(selected, Math.max(0, results.length - 1))

  function go(href: string) {
    onClose()
    router.push(href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelected(Math.min(active + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelected(Math.max(active - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = results[active]
      if (item) go(item.href)
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[15vh]">
      <div role="presentation" className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-lg overflow-hidden rounded-[6px] border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-gray-200 px-4">
          <MagnifyingGlass className="h-4.5 w-4.5 flex-shrink-0 text-gray-500" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={onKeyDown}
            placeholder="Search admin…"
            className="flex-1 bg-transparent py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
          <kbd className="rounded-[3px] border border-gray-200 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">Esc</kbd>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-gray-400">No matches</li>
          )}
          {results.map((entry, i) => {
            const Icon = ICONS[entry.icon]
            const isActive = i === active
            return (
              <li key={entry.href}>
                <button
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => go(entry.href)}
                  className={`flex w-full items-center gap-3 rounded-[4px] px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-gray-100/70" : "hover:bg-gray-100"
                  }`}
                >
                  {Icon && <Icon className="h-4.5 w-4.5 flex-shrink-0 text-gray-600" weight="regular" />}
                  <span className="flex-1 text-sm text-gray-900">{entry.label}</span>
                  <span className="text-[11px] text-gray-500">{entry.section}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
