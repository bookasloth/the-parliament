"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import type { GlossarySection } from "@/config/glossary"

export default function GlossaryClient({ sections }: { sections: GlossarySection[] }) {
  const [q, setQ] = useState("")
  const query = q.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!query) return sections
    return sections
      .map((s) => ({
        ...s,
        terms: s.terms.filter(
          (t) => t.term.toLowerCase().includes(query) || t.def.toLowerCase().includes(query),
        ),
      }))
      .filter((s) => s.terms.length > 0)
  }, [sections, query])

  const total = filtered.reduce((n, s) => n + s.terms.length, 0)

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#f3f2ef] pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Glossary</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every term you&rsquo;ll meet on The Parliament — houses, membership, karma, and more.
        </p>

        {/* Search */}
        <div className="sticky top-2 z-10 mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search terms…"
              aria-label="Search glossary"
              className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Jump nav (hidden while searching) */}
        {!query && (
          <nav className="mt-3 flex flex-wrap gap-1.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-brand"
              >
                {s.title}
              </a>
            ))}
          </nav>
        )}

        {query && (
          <p className="mt-3 text-xs text-gray-400">
            {total} {total === 1 ? "match" : "matches"} for &ldquo;{q.trim()}&rdquo;
          </p>
        )}

        {/* Sections */}
        <div className="mt-4 space-y-4">
          {total === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
              No terms match &ldquo;{q.trim()}&rdquo;.
            </div>
          ) : (
            filtered.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-20 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="mb-3">
                  <h2 className="text-base font-bold text-gray-900">{s.title}</h2>
                  {s.blurb && <p className="text-xs text-gray-400">{s.blurb}</p>}
                </div>
                <dl className="divide-y divide-gray-100">
                  {s.terms.map((t) => (
                    <div key={t.term} className="py-2.5 first:pt-0 last:pb-0">
                      <dt className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        {t.color && (
                          <span
                            className="inline-block h-3 w-3 flex-shrink-0 rounded-full ring-1 ring-black/5"
                            style={{ backgroundColor: t.color }}
                            aria-hidden
                          />
                        )}
                        {t.term}
                        {t.tag && (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                            {t.tag}
                          </span>
                        )}
                      </dt>
                      <dd className="mt-0.5 text-sm leading-snug text-gray-600">{t.def}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
