"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search as SearchIcon, Sparkles, User, FileText, Calendar, Building2, Hash } from "lucide-react"
import type { SearchScope } from "@/modules/search/service"

export const SCOPE_PILLS: { key: Exclude<SearchScope, "all">; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "people", label: "People", icon: User },
  { key: "posts", label: "Posts", icon: FileText },
  { key: "events", label: "Events", icon: Calendar },
  { key: "businesses", label: "Businesses", icon: Building2 },
  { key: "hashtags", label: "Hashtags", icon: Hash },
]

/** The search box. `variant="hero"` is the large landing bar; `"bar"` is the
 *  compact bar shown above results. Submits to /search preserving the scope. */
export function SearchBar({ initialQuery = "", scope = "all", variant = "hero" }: {
  initialQuery?: string
  scope?: SearchScope
  variant?: "hero" | "bar"
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (term.length < 1) return
    router.push(`/search?q=${encodeURIComponent(term)}&scope=${scope}`)
  }

  return (
    <form onSubmit={submit} className={`relative w-full ${variant === "hero" ? "max-w-2xl" : "max-w-xl"}`}>
      <div className={`flex items-center gap-2 rounded-full border border-gray-200 bg-white shadow-sm transition-shadow focus-within:shadow-md ${variant === "hero" ? "py-2.5 pl-5 pr-2" : "py-1.5 pl-4 pr-1.5"}`}>
        <SearchIcon className={`flex-shrink-0 text-gray-400 ${variant === "hero" ? "h-5 w-5" : "h-4 w-4"}`} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="What are you looking for?"
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-400 ${variant === "hero" ? "text-lg" : "text-sm"}`}
        />
        <span className="hidden items-center gap-1 text-xs font-semibold text-brand sm:flex">
          <Sparkles className="h-3.5 w-3.5" /> AI Mode
        </span>
        <button
          type="submit"
          aria-label="Search"
          className={`flex flex-shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-600 ${variant === "hero" ? "h-11 w-11" : "h-9 w-9"}`}
        >
          <SearchIcon className={variant === "hero" ? "h-5 w-5" : "h-4 w-4"} />
        </button>
      </div>
    </form>
  )
}

/** Scope selector pills — links that preserve the current query. */
export function ScopePills({ query, scope, variant = "hero" }: { query: string; scope: SearchScope; variant?: "hero" | "bar" }) {
  const q = query.trim()
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {variant === "bar" && (
        <Link
          href={`/search?q=${encodeURIComponent(q)}&scope=all`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${scope === "all" ? "border-brand bg-brand text-white" : "border-gray-200 bg-white text-gray-700 hover:border-brand hover:text-brand"}`}
        >
          All
        </Link>
      )}
      {SCOPE_PILLS.map((p) => {
        const Icon = p.icon
        const active = scope === p.key
        // On the landing page (no query) pills just pick a scope to search in.
        const href = q ? `/search?q=${encodeURIComponent(q)}&scope=${p.key}` : `/search?scope=${p.key}`
        return (
          <Link
            key={p.key}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-brand bg-brand text-white" : "border-gray-200 bg-white text-gray-700 hover:border-brand hover:text-brand"}`}
          >
            <Icon className="h-4 w-4" /> {p.label}
          </Link>
        )
      })}
    </div>
  )
}
