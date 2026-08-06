"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Search, Grid, List, MapPin, GraduationCap, Users,
  Briefcase, X, Loader2,
} from "lucide-react"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import { VerifiedTick } from "@/components/shared/VerifiedTick"
import { FollowButton } from "@/components/shared/FollowButton"
import { colorAvatar } from "@/lib/avatar"
import { MEMBERSHIP_TIERS, type MembershipTier } from "@/config/membership-colors"
import type { AlumniCard, Membership } from "@/lib/homepage-data"
import type { DirectoryRow } from "@/modules/directory/service"
import { RailColumns, type SidebarViewer } from "@/components/shared/ProfileSidebarView"

type Facets = {
  batches: { id: string; label: string }[]
  houses: { id: string; name: string; colorHex: string }[]
  industries: { name: string; count: number }[]
  cities?: string[]
}
type Params = Record<string, string | undefined>

const TIERS = [
  { value: "student", label: "Student" },
  { value: "associate", label: "Associate" },
  { value: "premium", label: "Premium" },
  { value: "life", label: "Life" },
]

const SORTS = [
  { value: "active", label: "Recently active" },
  { value: "newest", label: "Newest members" },
  { value: "name", label: "Name (A–Z)" },
]

function tierAccent(status: string): string {
  return (MEMBERSHIP_TIERS[status as MembershipTier] ?? MEMBERSHIP_TIERS.associate).accent
}

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
  rows, total, facets, current, meId, stats, followingIds = [], sidebarViewer = null,
}: {
  rows: DirectoryRow[]
  total: number
  facets: Facets
  current: Params
  meId: string | null
  stats: { totalActive: number; verifiedCount: number; batches: number; industries: number }
  // ponytail: covers first page only; lazily-loaded rows default to not-following (self-corrects on click).
  followingIds?: string[]
  sidebarViewer?: SidebarViewer | null
}) {
  const followingSet = new Set(followingIds)
  const router = useRouter()
  const [view, setView] = useState<"grid" | "list">("grid")
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

  // Debounced live search — pushes after typing settles (Enter still works).
  useEffect(() => {
    const term = q.trim()
    if (term === (current.q ?? "")) return
    const id = setTimeout(() => go({ q: term || undefined }), 400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

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
    current.industry && { key: "industry", label: current.industry },
    current.city && { key: "city", label: current.city },
    current.verified === "1" && { key: "verified", label: "Verified" },
  ].filter(Boolean) as { key: string; label: string }[]

  // 4px controls throughout, brand focus.
  const sel = "rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand hover:border-gray-300"

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-4">
      <RailColumns sidebarViewer={sidebarViewer}>
      <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900 sm:text-2xl">Community</h1>
          <p className="text-xs text-gray-500 sm:text-sm">Search and filter the alumni network.</p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded border border-gray-200 bg-white px-4 py-2 sm:justify-start sm:gap-4">
          {[
            { label: "Alumni", value: stats.totalActive.toLocaleString(), icon: <Users className="h-4 w-4 text-brand" /> },
            { label: "Verified", value: stats.verifiedCount.toLocaleString(), icon: <VerifiedTick size={16} /> },
            { label: "Batches", value: `${stats.batches}`, icon: <GraduationCap className="h-4 w-4 text-amber-500" /> },
            { label: "Industries", value: `${stats.industries}`, icon: <Briefcase className="h-4 w-4 text-emerald-500" /> },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 sm:gap-2">
              {s.icon}
              <div className="leading-none">
                <span className="text-base font-bold text-gray-900 tabular-nums">{s.value}</span>
                {/* Label hidden on mobile — icon + number only */}
                <span className="ml-1 hidden text-[11px] text-gray-500 sm:inline">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + 4 filters — inline on desktop, search over a 2×2 filter grid on mobile. */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <form onSubmit={(e) => { e.preventDefault(); go({ q }) }} className="relative lg:w-1/2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search alumni by name or username…"
            className="w-full rounded border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
          />
        </form>
        {/* Filters: 2-col on mobile, wrap on desktop. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:w-1/2 lg:flex-wrap lg:items-center">
          <select className={`${sel} w-full min-w-0 lg:flex-1 lg:basis-[30%]`} value={current.batch ?? ""} onChange={(e) => go({ batch: e.target.value || undefined })}>
            <option value="">All batches</option>
            {facets.batches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          <select className={`${sel} w-full min-w-0 lg:flex-1 lg:basis-[30%]`} value={current.house ?? ""} onChange={(e) => go({ house: e.target.value || undefined })}>
            <option value="">All houses</option>
            {facets.houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select className={`${sel} w-full min-w-0 lg:flex-1 lg:basis-[30%]`} value={current.membership ?? ""} onChange={(e) => go({ membership: e.target.value || undefined })}>
            <option value="">All tiers</option>
            {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className={`${sel} w-full min-w-0 lg:flex-1 lg:basis-[30%]`} value={current.industry ?? ""} onChange={(e) => go({ industry: e.target.value || undefined })} disabled={facets.industries.length === 0}>
            <option value="">All industries</option>
            {facets.industries.map((ind) => <option key={ind.name} value={ind.name}>{ind.name} ({ind.count})</option>)}
          </select>
          <select className={`${sel} w-full min-w-0 lg:flex-1 lg:basis-[30%]`} value={current.city ?? ""} onChange={(e) => go({ city: e.target.value || undefined })} disabled={!facets.cities || facets.cities.length === 0}>
            <option value="">All locations</option>
            {(facets.cities ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Verified toggle + view switch */}
      <div className="flex flex-wrap items-center gap-2">
        <label className={`flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1.5 text-sm transition-colors ${current.verified === "1" ? "border-brand bg-brand-50 text-brand" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>
          <input type="checkbox" checked={current.verified === "1"} onChange={(e) => go({ verified: e.target.checked ? "1" : undefined })} className="h-3.5 w-3.5 accent-brand" />
          Verified only
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          Sort
          <select className={sel} value={current.sort ?? "active"} onChange={(e) => go({ sort: e.target.value === "active" ? undefined : e.target.value })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <div className="flex-1" />
        <div className="flex items-center gap-1 rounded border border-gray-200 bg-white p-1">
          <button aria-label="Grid view" onClick={() => setView("grid")} className={`rounded p-1.5 transition-colors ${view === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}><Grid className="h-4 w-4" /></button>
          <button aria-label="List view" onClick={() => setView("list")} className={`rounded p-1.5 transition-colors ${view === "list" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}><List className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Active-filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span key={c.key} className="flex items-center gap-1 rounded bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand">
              {c.label}
              <button aria-label={`Remove ${c.label} filter`} onClick={() => go({ [c.key]: undefined })}><X className="h-3 w-3" /></button>
            </span>
          ))}
          <button onClick={() => { setQ(""); router.push("/community") }} className="text-xs font-medium text-red-500 hover:text-red-600">Clear all</button>
        </div>
      )}

      <p className="text-xs text-gray-500">{total.toLocaleString()} alumni found{current.q && ` for "${current.q}"`}</p>

      {items.length === 0 ? (
        <div className="rounded border border-gray-200 bg-white py-16 text-center">
          <Search className="mx-auto mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No alumni found</p>
          <p className="mt-1 text-xs text-gray-400">Try a different search or clear filters</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((r, i) => (
            <motion.div key={r.id} className="h-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: (i % 8) * 0.03 }}>
              <AlumniProfileCard
                alumni={toCard(r)}
                profileHref={`/${r.username}`}
                verified={r.isVerified}
                tierColoredVerified
                hideMembership
                actions={
                  <div className="flex w-full gap-2">
                    {meId !== r.id && (
                      <div className="flex-1 [&>button]:flex [&>button]:w-full [&>button]:justify-center [&>button]:py-2">
                        <FollowButton userId={r.id} initialFollowing={followingSet.has(r.id)} />
                      </div>
                    )}
                    <a href={`/${r.username}`} className="flex-1 rounded border border-gray-200 px-4 py-2 text-center text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50">Profile</a>
                  </div>
                }
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="flex items-center gap-4 rounded border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
              <a href={`/${r.username}`} className="flex-shrink-0">
                <Image src={r.photoUrl || colorAvatar(r.id)} alt={r.legalName} className="h-12 w-12 rounded-full object-cover" style={{ boxShadow: r.house ? `0 0 0 2.5px ${r.house.colorHex}` : undefined }} width={48} height={48} />
              </a>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <a href={`/${r.username}`} className="text-sm font-semibold text-gray-900 hover:text-brand">{r.displayName || r.legalName}</a>
                  {r.isVerified && <VerifiedTick size={15} color={tierAccent(r.membershipStatus)} />}
                  {r.house && <span className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: r.house.colorHex, color: r.house.name === "Udaigiri" ? "#666" : "#fff" }}>{r.house.name}</span>}
                </div>
                {r.headline && <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{r.headline}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                  {r.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}</span>}
                  {r.batch && <span>{r.batch.label} Batch</span>}
                  {r.industry && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{r.industry}</span>}
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
      </RailColumns>
    </div>
  )
}
