"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Scroll, MagnifyingGlass, CaretLeft, CaretRight } from "@phosphor-icons/react"
import { PageHeader, StatCard } from "../admin-ui"

export interface AuditRow {
  id: string
  actor: string
  action: string
  entityType: string | null
  entityId: string | null
  payload: string
  ip: string | null
  at: string
}

export interface AuditQuery { page: number; q: string; action: string }
export interface AuditPageInfo { page: number; pageCount: number; filteredTotal: number; pageSize: number }

function fmt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function AuditLogsClient({
  rows,
  actions = [],
  query,
  pageInfo,
}: {
  rows: AuditRow[]
  actions?: string[]
  query?: AuditQuery
  pageInfo?: AuditPageInfo
}) {
  const router = useRouter()
  const q0 = query ?? { page: 1, q: "", action: "" }

  function pushQuery(patch: Partial<AuditQuery>) {
    const next = { ...q0, ...patch }
    if (patch.page === undefined) next.page = 1
    const params = new URLSearchParams()
    if (next.q) params.set("q", next.q)
    if (next.action) params.set("action", next.action)
    if (next.page > 1) params.set("page", String(next.page))
    const qs = params.toString()
    router.push(qs ? `/admin/audit-logs?${qs}` : "/admin/audit-logs")
  }

  const [search, setSearch] = useState(q0.q)
  useEffect(() => {
    if (search === q0.q) return
    const t = setTimeout(() => pushQuery({ q: search }), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

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
        title="Audit Logs"
        description="Every administrative action — who did what, when, on which entity"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Entries" value={total.toLocaleString()} icon={<Scroll className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Distinct Actions" value={String(actions.length)} icon={<Scroll className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="This Page" value={String(rows.length)} icon={<Scroll className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" weight="duotone" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, entity, IP…"
            className="w-full rounded-lg border border-zinc-800 bg-[#111113] pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-600"
          />
        </div>
        <select
          value={q0.action || "All"}
          onChange={(e) => pushQuery({ action: e.target.value === "All" ? "" : e.target.value })}
          className="rounded-lg border border-zinc-800 bg-[#111113] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-600"
        >
          {["All", ...actions].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-[#111113] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">Payload</th>
                <th className="px-4 py-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-zinc-500">No matching log entries</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/40">
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">{fmt(r.at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-200">{r.actor}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">{r.action}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                    {r.entityType ? <>{r.entityType}{r.entityId && <span className="text-zinc-600"> · {r.entityId.slice(0, 8)}</span>}</> : "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[280px] truncate font-mono text-[11px] text-zinc-500" title={r.payload}>
                    {r.payload === "{}" ? "—" : r.payload}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-500">{r.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">Showing <span className="font-semibold text-zinc-300">{from}–{to}</span> of <span className="font-semibold text-zinc-300">{total.toLocaleString()}</span></p>
          <div className="flex items-center gap-1">
            <button onClick={() => pushQuery({ page: page - 1 })} className="p-1.5 rounded-md border border-zinc-800 text-zinc-500 hover:bg-zinc-800 disabled:opacity-40" disabled={page <= 1}>
              <CaretLeft className="h-4 w-4" weight="duotone" />
            </button>
            {nums.map((p) => (
              <button key={p} onClick={() => pushQuery({ page: p })}
                className={`h-7 w-7 rounded-md text-xs font-semibold ${page === p ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}>
                {p}
              </button>
            ))}
            {nums.length > 0 && nums[nums.length - 1] < last && <span className="text-xs text-zinc-500 px-1">… {last}</span>}
            <button onClick={() => pushQuery({ page: page + 1 })} className="p-1.5 rounded-md border border-zinc-800 text-zinc-500 hover:bg-zinc-800 disabled:opacity-40" disabled={page >= last}>
              <CaretRight className="h-4 w-4" weight="duotone" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
