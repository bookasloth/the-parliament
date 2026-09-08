"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Search, Shuffle, Check, RotateCcw, Sparkles, X } from "lucide-react"
import type { GlossarySection, GlossaryTerm } from "@/config/glossary"

const STORAGE_KEY = "glossary-read-v1"
const termKey = (sectionId: string, term: string) => `${sectionId}::${term}`
const anchorId = (sectionId: string, term: string) =>
  `g-${sectionId}-${term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`

/** Wrap the first case-insensitive match of `q` in a <mark>. */
function highlight(text: string, q: string) {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q)
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-yellow-200 px-0.5 text-gray-900">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

export default function GlossaryClient({ sections }: { sections: GlossarySection[] }) {
  const [q, setQ] = useState("")
  const [cat, setCat] = useState<string>("all")
  const [read, setRead] = useState<Set<string>>(new Set())
  const [flash, setFlash] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const query = q.trim().toLowerCase()
  const totalTerms = useMemo(() => sections.reduce((n, s) => n + s.terms.length, 0), [sections])

  // ── Read-progress persistence ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setRead(new Set(JSON.parse(raw) as string[]))
    } catch {}
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...read]))
    } catch {}
  }, [read, hydrated])

  const toggleRead = useCallback((key: string) => {
    setRead((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  // ── "/" focuses search ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // ── Filtering (category + search) ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return sections
      .filter((s) => cat === "all" || s.id === cat)
      .map((s) => ({
        ...s,
        terms: query
          ? s.terms.filter((t) => t.term.toLowerCase().includes(query) || t.def.toLowerCase().includes(query))
          : s.terms,
      }))
      .filter((s) => s.terms.length > 0)
  }, [sections, cat, query])
  const shownCount = filtered.reduce((n, s) => n + s.terms.length, 0)

  // ── "Surprise me" — jump to a random term + flash it ────────────────────────
  const surprise = useCallback(() => {
    const pool = sections.flatMap((s) => s.terms.map((t) => ({ s, t })))
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (!pick) return
    setQ("")
    setCat("all")
    const id = anchorId(pick.s.id, pick.t.term)
    setFlash(id)
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 1800)
  }, [sections])

  const pct = totalTerms ? Math.round((read.size / totalTerms) * 100) : 0
  const done = hydrated && read.size >= totalTerms && totalTerms > 0

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#f3f2ef] pb-20">
      {/* stagger reveal — pure CSS so content is never JS-gated; reduced-motion off */}
      <style>{`
        @keyframes gloFade { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .glo-card { animation: gloFade .45s both; animation-delay: calc(var(--i, 0) * 28ms) }
        @keyframes gloFlash { 0%,100% { box-shadow: 0 0 0 0 rgba(0,154,228,0) } 30% { box-shadow: 0 0 0 3px rgba(0,154,228,.5) } }
        .glo-flash { animation: gloFlash 1.6s ease-out }
        @media (prefers-reduced-motion: reduce) { .glo-card { animation: none } .glo-flash { animation: none } }
      `}</style>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Glossary</h1>
            <p className="mt-1 text-sm text-gray-500">
              Every word on The Parliament — <span className="font-semibold text-gray-700">{totalTerms} terms</span> across {sections.length} categories.
            </p>
          </div>
          <button
            onClick={surprise}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 active:scale-95"
          >
            <Shuffle className="h-4 w-4" /> Surprise me
          </button>
        </div>

        {/* Progress */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3.5">
          {done ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <Sparkles className="h-4 w-4" /> You read the whole book — all {totalTerms} terms. Legend. 🎉
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <span className="text-gray-700">{read.size}</span> / {totalTerms} learned · tap “Got it” as you go
            </div>
          )}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : "bg-brand"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {read.size > 0 && (
            <button onClick={() => setRead(new Set())} className="mt-2 flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600">
              <RotateCcw className="h-3 w-3" /> Reset progress
            </button>
          )}
        </div>

        {/* Search */}
        <div className="sticky top-2 z-10 mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search terms…  (press /)"
              aria-label="Search glossary"
              className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category filter chips (with counts) */}
        <nav className="mt-3 flex flex-wrap gap-1.5">
          <Chip active={cat === "all"} onClick={() => setCat("all")} label="All" count={totalTerms} />
          {sections.map((s) => (
            <Chip key={s.id} active={cat === s.id} onClick={() => setCat(s.id)} label={s.title} count={s.terms.length} />
          ))}
        </nav>

        {query && (
          <p className="mt-3 text-xs text-gray-400">
            {shownCount} {shownCount === 1 ? "match" : "matches"} for “{q.trim()}”
          </p>
        )}

        {/* Sections */}
        <div className="mt-4 space-y-4">
          {shownCount === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
              Nothing matches “{q.trim()}”. Try another word.
            </div>
          ) : (
            filtered.map((s) => (
              <section key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-base font-bold text-gray-900">{s.title}</h2>
                  <span className="text-[11px] text-gray-400">{s.terms.length}</span>
                </div>
                {s.blurb && <p className="mb-2 text-xs text-gray-400">{s.blurb}</p>}
                <div className="space-y-1.5">
                  {s.terms.map((t, i) => (
                    <TermCard
                      key={t.term}
                      id={anchorId(s.id, t.term)}
                      index={i}
                      term={t}
                      query={query}
                      isRead={read.has(termKey(s.id, t.term))}
                      flash={flash === anchorId(s.id, t.term)}
                      onToggle={() => toggleRead(termKey(s.id, t.term))}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active ? "border-brand bg-brand text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-brand"
      }`}
    >
      {label} <span className={active ? "text-white/70" : "text-gray-400"}>{count}</span>
    </button>
  )
}

function TermCard({
  id, index, term, query, isRead, flash, onToggle,
}: {
  id: string
  index: number
  term: GlossaryTerm
  query: string
  isRead: boolean
  flash: boolean
  onToggle: () => void
}) {
  return (
    <div
      id={id}
      style={{ ["--i" as string]: Math.min(index, 16) }}
      className={`glo-card scroll-mt-24 rounded-lg border p-3 transition-colors ${flash ? "glo-flash " : ""}${
        isRead ? "border-emerald-100 bg-emerald-50/40" : "border-gray-100 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            {term.color && (
              <span className="inline-block h-3 w-3 flex-shrink-0 rounded-full ring-1 ring-black/5" style={{ backgroundColor: term.color }} aria-hidden />
            )}
            <span>{highlight(term.term, query)}</span>
            {term.tag && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">{term.tag}</span>}
          </div>
          <p className="mt-0.5 text-sm leading-snug text-gray-600">{highlight(term.def, query)}</p>
        </div>
        <button
          onClick={onToggle}
          aria-pressed={isRead}
          aria-label={isRead ? "Mark unread" : "Got it"}
          className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
            isRead
              ? "border-emerald-200 bg-emerald-500 text-white"
              : "border-gray-200 bg-white text-gray-500 hover:border-brand hover:text-brand"
          }`}
        >
          <Check className="h-3 w-3" /> {isRead ? "Got it" : "Got it?"}
        </button>
      </div>
    </div>
  )
}
