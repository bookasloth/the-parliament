"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

type Facets = {
  batches: { id: string; label: string }[]
  houses: { id: string; name: string; colorHex: string }[]
}

const TIERS = [
  { value: "student", label: "Student" },
  { value: "associate", label: "Associate" },
  { value: "premium", label: "Premium" },
  { value: "life", label: "Life" },
]

export function CommunityFilters({ facets, current }: { facets: Facets; current: Record<string, string | undefined> }) {
  const router = useRouter()
  const [q, setQ] = useState(current.q ?? "")

  // Build a URL from the current params plus a patch (drops empties + resets page).
  function go(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged: Record<string, string | undefined> = { ...current, ...patch, page: undefined }
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v)
    const s = params.toString()
    router.push(s ? `/community?${s}` : "/community")
  }

  const hasFilters = current.q || current.batch || current.house || current.membership || current.city || current.verified

  const sel = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <form onSubmit={(e) => { e.preventDefault(); go({ q }) }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or username…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Search</button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <select className={sel} value={current.batch ?? ""} onChange={(e) => go({ batch: e.target.value || undefined })}>
          <option value="">All batches</option>
          {facets.batches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <select className={sel} value={current.house ?? ""} onChange={(e) => go({ house: e.target.value || undefined })}>
          <option value="">All houses</option>
          {facets.houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select className={sel} value={current.membership ?? ""} onChange={(e) => go({ membership: e.target.value || undefined })}>
          <option value="">All tiers</option>
          {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
          <input type="checkbox" checked={current.verified === "1"} onChange={(e) => go({ verified: e.target.checked ? "1" : undefined })} className="h-4 w-4" />
          Verified only
        </label>
        {hasFilters && (
          <button onClick={() => { setQ(""); router.push("/community") }} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-red-600">
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>
    </div>
  )
}
