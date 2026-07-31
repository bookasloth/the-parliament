"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Search, Grid, List, MapPin, GraduationCap, Users, ShieldCheck,
  ChevronDown, X, SlidersHorizontal, Loader2,
} from "lucide-react"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import { FollowButton } from "@/components/shared/FollowButton"
import { colorAvatar } from "@/lib/avatar"
import type { AlumniCard, Membership } from "@/lib/homepage-data"
import type { DirectoryRow } from "@/modules/directory/service"

type Facets = {
  batches: { id: string; label: string }[]
  houses: { id: string; name: string; colorHex: string }[]
}
type Params = Record<string, string | undefined>

const TIERS = [
  { value: "student", label: "Student" },
  { value: "associate", label: "Associate" },
  { value: "premium", label: "Premium" },
  { value: "life", label: "Life" },
]

function toCard(r: DirectoryRow): AlumniCard {
  return {
    id: r.id,
    name: r.displayName || r.legalName,
    batch: r.batch?.label ?? "",
    batchLabel: r.batch ? `${r.batch.label} Batch` : "",
    batchAlt: r.batch?.label ?? "",
    house: r.house?.name ?? "",
    company: r.company ?? "",
    achievement: "",
    image: r.photoUrl || colorAvatar(r.id),
    location: r.city ?? undefined,
    membership: (r.membershipStatus as Membership) ?? "student",
    bio: r.headline ?? undefined,
  }
}

function toQuery(current: Params, extra: Params = {}): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...current, ...extra })) if (v) params.set(k, v)
  return params.toString()
}

export function CommunityClient({
  rows, total, facets, current, meId, stats, followingIds = [],
}: {
  rows: DirectoryRow[]
  total: number
  facets: Facets
  current: Params
  meId: string | null
  stats: { totalActive: number; verifiedCount: number; batches: number }
  // ponytail: covers first page only; lazily-loaded rows default to not-following (self-corrects on click).
  followingIds?: string[]
}) {
  const followingSet = new Set(followingIds)
  const router = useRouter()
  const [view, setView] = useState<"grid" | "list">("grid")
  const [showFilters, setShowFilters] = useState(false)
  const [q, setQ] = useState(current.q ?? "")

  const [items, setItems] = useState<DirectoryRow[]>(rows)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const paramsKey = JSON.stringify({ ...current, page: undefined })

  // Reset the list whenever the filters change (server re-renders with new rows).
  useEffect(() => {
    setItems(rows)
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  const hasMore = items.length < total

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const next = page + 1
      const res = await fetch(`/api/community?${toQuery(current, { page: String(next) })}`)
      const data = await res.json()
      setItems((prev) => [...prev, ...(data.rows as DirectoryRow[])])
      setPage(next)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, current])

  // Infinite scroll: observe a sentinel near the bottom.
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: "400px" })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  function go(patch: Params) {
    const s = toQuery({ ...current, ...patch, page: undefined })
    router.push(s ? `/community?${s}` : "/community")
  }

  const batchLabel = facets.batches.find((b) => b.id === current.batch)?.label
  const houseName = facets.houses.find((h) => h.id === current.house)?.name
  const tierLabel = TIERS.find((t) => t.value === current.membership)?.label
  const chips = [
    batchLabel && { key: "batch", label: batchLabel },
    houseName && { key: "house", label: houseName },
    tierLabel && { key: "membership", label: tierLabel },
    current.verified === "1" && { key: "verified", label: "Verified" },
  ].filter(Boolean) as { key: string; label: string }[]

  const sel = "w-full rounded-lg border border-gray-200 bg-white pl-3 pr-7 py-2 text-sm text-gray-700 outline-none focus:border-brand appearance-none"

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-5 space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Community</h1>
        <p className="text-sm text-gray-500">Search and filter the alumni network.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); go({ q }) }} className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search alumni by name or username…"
          className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
        />
      </form>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Alumni", value: stats.totalActive.toLocaleString(), icon: <Users className="h-4 w-4 text-brand" /> },
          { label: "Verified", value: stats.verifiedCount.toLocaleString(), icon: <ShieldCheck className="h-4 w-4 text-blue-500" /> },
          { label: "Batches", value: `${stats.batches}`, icon: <GraduationCap className="h-4 w-4 text-amber-500" /> },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex-shrink-0">{s.icon}</div>
            <div>
              <p className="text-lg font-bold leading-none text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-[10px] text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${showFilters || chips.length ? "border-brand bg-brand-50 text-brand" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {chips.length > 0 && <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{chips.length}</span>}
        </button>

        {chips.map((c) => (
          <span key={c.key} className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand">
            {c.label}
            <button onClick={() => go({ [c.key]: undefined })}><X className="h-3 w-3" /></button>
          </span>
        ))}

        <div className="flex-1" />
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          <button onClick={() => setView("grid")} className={`rounded p-1.5 transition-colors ${view === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}><Grid className="h-4 w-4" /></button>
          <button onClick={() => setView("list")} className={`rounded p-1.5 transition-colors ${view === "list" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}><List className="h-4 w-4" /></button>
        </div>
      </div>

      {showFilters && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Batch">
              <select className={sel} value={current.batch ?? ""} onChange={(e) => go({ batch: e.target.value || undefined })}>
                <option value="">All batches</option>
                {facets.batches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </Field>
            <Field label="House">
              <select className={sel} value={current.house ?? ""} onChange={(e) => go({ house: e.target.value || undefined })}>
                <option value="">All houses</option>
                {facets.houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </Field>
            <Field label="Membership">
              <select className={sel} value={current.membership ?? ""} onChange={(e) => go({ membership: e.target.value || undefined })}>
                <option value="">All tiers</option>
                {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">Verified</label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-[9px] text-sm text-gray-700">
                <input type="checkbox" checked={current.verified === "1"} onChange={(e) => go({ verified: e.target.checked ? "1" : undefined })} className="h-4 w-4" />
                Verified only
              </label>
            </div>
          </div>
          {chips.length > 0 && (
            <button onClick={() => { setQ(""); router.push("/community") }} className="text-xs font-medium text-red-500 hover:text-red-600">Clear all filters</button>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">{total.toLocaleString()} alumni found{current.q && ` for "${current.q}"`}</p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Search className="mx-auto mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No alumni found</p>
          <p className="mt-1 text-xs text-gray-400">Try a different search or clear filters</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: (i % 8) * 0.03 }}>
              <AlumniProfileCard
                alumni={toCard(r)}
                profileHref={`/${r.username}`}
                verified={r.isVerified}
                actions={
                  <>
                    <a href={`/${r.username}`} className="rounded-md border border-brand bg-white px-4 py-1.5 text-sm font-medium text-brand transition-all hover:bg-brand hover:text-white">View Profile</a>
                    {meId !== r.id && <FollowButton userId={r.id} initialFollowing={followingSet.has(r.id)} />}
                  </>
                }
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
              <a href={`/${r.username}`} className="flex-shrink-0">
                <Image src={r.photoUrl || colorAvatar(r.id)} alt={r.legalName} className="h-12 w-12 rounded-full object-cover" style={{ boxShadow: r.house ? `0 0 0 2.5px ${r.house.colorHex}` : undefined }} width={48} height={48} />
              </a>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <a href={`/${r.username}`} className="text-sm font-semibold text-gray-900 hover:text-brand">{r.displayName || r.legalName}</a>
                  {r.isVerified && <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 fill-blue-100 text-blue-500" />}
                  {r.house && <span className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: r.house.colorHex, color: r.house.name === "Udaigiri" ? "#666" : "#fff" }}>{r.house.name}</span>}
                </div>
                {r.headline && <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{r.headline}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                  {r.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}</span>}
                  {r.batch && <span>{r.batch.label} Batch</span>}
                </div>
              </div>
              {meId !== r.id && <FollowButton userId={r.id} initialFollowing={followingSet.has(r.id)} />}
            </div>
          ))}
        </div>
      )}

      {/* Infinite-scroll sentinel */}
      {hasMore && (
        <div ref={sentinel} className="flex justify-center py-6 text-sm text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <p className="py-6 text-center text-xs text-gray-400">You&rsquo;ve reached the end · {total.toLocaleString()} alumni</p>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</label>
      <div className="relative">{children}<ChevronDown className="pointer-events-none absolute right-2 top-[19px] h-3.5 w-3.5 text-gray-400" /></div>
    </div>
  )
}
