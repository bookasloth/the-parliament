"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Storefront, MagnifyingGlass, CaretLeft, CaretRight, Star } from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, Button, Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "../admin-ui"
import { setBusinessStatus } from "./actions"

export interface BusinessRow {
  id: string
  name: string
  city: string | null
  owner: string
  category: string
  status: string
  ratingAvg: number
  ratingCount: number
  reviewCount: number
  createdAt: string
}

export interface CategoryOption { id: string; label: string }
export interface BusinessQuery { page: number; q: string; status: string; category: string }
export interface BusinessPageInfo { page: number; pageCount: number; filteredTotal: number; pageSize: number }
export interface BusinessStats { total: number; pending: number; approved: number; suspended: number }

const STATUS_OPTIONS = ["pending", "approved", "rejected", "suspended"]

export default function BusinessesClient({
  rows,
  categories = [],
  stats,
  query,
  pageInfo,
}: {
  rows: BusinessRow[]
  categories?: CategoryOption[]
  stats: BusinessStats
  query?: BusinessQuery
  pageInfo?: BusinessPageInfo
}) {
  const router = useRouter()
  const q0 = query ?? { page: 1, q: "", status: "", category: "" }
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function pushQuery(patch: Partial<BusinessQuery>) {
    const next = { ...q0, ...patch }
    if (patch.page === undefined) next.page = 1
    const params = new URLSearchParams()
    if (next.q) params.set("q", next.q)
    if (next.status) params.set("status", next.status)
    if (next.category) params.set("category", next.category)
    if (next.page > 1) params.set("page", String(next.page))
    const qs = params.toString()
    router.push(qs ? `/admin/businesses?${qs}` : "/admin/businesses")
  }

  const [search, setSearch] = useState(q0.q)
  useEffect(() => {
    if (search === q0.q) return
    const t = setTimeout(() => pushQuery({ q: search }), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function act(id: string, status: "approved" | "rejected" | "suspended" | "pending") {
    setBusyId(id)
    startTransition(async () => {
      await setBusinessStatus(id, status)
      setBusyId(null)
      router.refresh()
    })
  }

  const total = pageInfo?.filteredTotal ?? rows.length
  const size = pageInfo?.pageSize ?? rows.length
  const page = pageInfo?.page ?? 1
  const last = pageInfo?.pageCount ?? 1
  const from = total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, total)
  const start = Math.max(1, Math.min(page - 2, last - 4))
  const nums = Array.from({ length: Math.min(5, last) }, (_, i) => start + i).filter((p) => p <= last)

  return (
    <div>
      <PageHeader
        title="Business Directory"
        description="Moderate alumni-owned business listings — approve, reject, or suspend"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total" value={stats.total.toLocaleString()} icon={<Storefront className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Pending" value={stats.pending.toLocaleString()} icon={<Storefront className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Approved" value={stats.approved.toLocaleString()} icon={<Storefront className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Suspended" value={stats.suspended.toLocaleString()} icon={<Storefront className="h-4.5 w-4.5" weight="duotone" />} accent="rose" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" weight="duotone" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or city…"
            className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-600"
          />
        </div>
        <select
          value={q0.status || "All"}
          onChange={(e) => pushQuery({ status: e.target.value === "All" ? "" : e.target.value })}
          className="rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-600 capitalize"
        >
          {["All", ...STATUS_OPTIONS].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={q0.category || "All"}
          onChange={(e) => pushQuery({ category: e.target.value === "All" ? "" : e.target.value })}
          className="rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-600"
        >
          <option value="All">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div className="rounded-[4px] border border-zinc-800 bg-[#111113] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr className="border-b border-zinc-800 hover:bg-transparent">
                <Th>Name</Th>
                <Th>Owner</Th>
                <Th>Category</Th>
                <Th>Rating</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.length === 0 && (
                <Tr className="hover:bg-transparent">
                  <Td colSpan={6}>
                    <EmptyState
                      icon={<Storefront className="h-6 w-6" weight="duotone" />}
                      title="No businesses found"
                      description="No listings match the current filters."
                    />
                  </Td>
                </Tr>
              )}
              {rows.map((r) => {
                const disabled = isPending && busyId === r.id
                return (
                  <Tr key={r.id}>
                    <Td>
                      <div className="font-medium text-zinc-200">{r.name}</div>
                      {r.city && <div className="text-[11px] text-zinc-500">{r.city}</div>}
                    </Td>
                    <Td className="text-zinc-400">{r.owner}</Td>
                    <Td className="text-zinc-400">{r.category}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-zinc-300">
                        <Star className="h-3.5 w-3.5 text-amber-400" weight="fill" />
                        {r.ratingAvg.toFixed(1)}
                        <span className="text-[11px] text-zinc-500">({r.reviewCount})</span>
                      </span>
                    </Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" variant="primary" disabled={disabled} onClick={() => act(r.id, "approved")}>Approve</Button>
                            <Button size="sm" variant="danger" disabled={disabled} onClick={() => act(r.id, "rejected")}>Reject</Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button size="sm" variant="danger" disabled={disabled} onClick={() => act(r.id, "suspended")}>Suspend</Button>
                        )}
                        {(r.status === "suspended" || r.status === "rejected") && (
                          <Button size="sm" variant="ghost" disabled={disabled} onClick={() => act(r.id, "approved")}>Approve</Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">Showing <span className="font-semibold text-zinc-300">{from}–{to}</span> of <span className="font-semibold text-zinc-300">{total.toLocaleString()}</span></p>
          <div className="flex items-center gap-1">
            <button onClick={() => pushQuery({ page: page - 1 })} className="p-1.5 rounded-[3px] border border-zinc-800 text-zinc-500 hover:bg-zinc-800 disabled:opacity-40" disabled={page <= 1}>
              <CaretLeft className="h-4 w-4" weight="duotone" />
            </button>
            {nums.map((p) => (
              <button key={p} onClick={() => pushQuery({ page: p })}
                className={`h-7 w-7 rounded-[3px] text-xs font-semibold ${page === p ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}>
                {p}
              </button>
            ))}
            {nums.length > 0 && nums[nums.length - 1] < last && <span className="text-xs text-zinc-500 px-1">… {last}</span>}
            <button onClick={() => pushQuery({ page: page + 1 })} className="p-1.5 rounded-[3px] border border-zinc-800 text-zinc-500 hover:bg-zinc-800 disabled:opacity-40" disabled={page >= last}>
              <CaretRight className="h-4 w-4" weight="duotone" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
