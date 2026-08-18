"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { MagnifyingGlass, ArrowRight, ArrowSquareOut, Books } from "@phosphor-icons/react"
import { PageHeader, EmptyState, Modal } from "../admin-ui"
import type { Guide } from "./guides"

/** Group guides by their `section`, preserving first-seen order. */
function groupBySection(guides: Guide[]): [string, Guide[]][] {
  const groups = new Map<string, Guide[]>()
  for (const g of guides) {
    const list = groups.get(g.section) ?? []
    list.push(g)
    groups.set(g.section, list)
  }
  return [...groups.entries()]
}

export default function HelpClient({ guides }: { guides: Guide[] }) {
  const [query, setQuery] = useState("")
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  // Deep-link: open the guide named in the URL hash on mount. Read after mount
  // (not in the initializer) so server and client first-render agree — the hash
  // is a client-only external system. This is that legitimate sync, not a cascade.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hash && guides.some((g) => g.slug === hash)) setOpenSlug(hash)
  }, [guides])

  // Keep the hash in sync so the topbar "?" (and share links) target the guide.
  function openGuide(slug: string) {
    setOpenSlug(slug)
    history.replaceState(null, "", `#${slug}`)
  }
  function closeGuide() {
    setOpenSlug(null)
    history.replaceState(null, "", window.location.pathname + window.location.search)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return guides
    return guides.filter((g) =>
      [g.title, g.summary, g.section].some((f) => f.toLowerCase().includes(q)),
    )
  }, [guides, query])

  const groups = groupBySection(filtered)
  const active = guides.find((g) => g.slug === openSlug) ?? null

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Help Center"
        description="Task guides for the tools you can access. Search or pick a task to see the steps."
      />

      <div className="relative mb-6">
        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides…"
          className="w-full rounded-[3px] border border-zinc-800 bg-[#111113] py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none"
        />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={<Books className="h-8 w-8" weight="duotone" />}
          title="No guides match your search"
          description="Try a different term, or clear the search to see every guide you can access."
        />
      ) : (
        <div className="space-y-8">
          {groups.map(([section, items]) => (
            <section key={section}>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{section}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((g) => (
                  <button
                    key={g.slug}
                    onClick={() => openGuide(g.slug)}
                    className="group rounded-[5px] border border-zinc-800 bg-[#111113] p-4 text-left transition-colors hover:border-zinc-700"
                  >
                    <p className="text-sm font-semibold text-zinc-100">{g.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{g.summary}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-400">
                      View steps
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" weight="bold" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal open={active !== null} onClose={closeGuide} title={active?.title}>
        {active && (
          <div>
            <p className="text-sm text-zinc-400">{active.summary}</p>
            <ol className="mt-4 space-y-3">
              {active.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[3px] bg-zinc-800 text-xs font-bold text-zinc-300 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm text-zinc-200">{step}</span>
                </li>
              ))}
            </ol>
            {active.href && (
              <Link
                href={active.href}
                className="mt-5 inline-flex items-center gap-1.5 rounded-[3px] bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                Open {active.href}
                <ArrowSquareOut className="h-4 w-4" weight="duotone" />
              </Link>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
