"use client"

import { useMemo, useState } from "react"
import { Scroll, MagnifyingGlass } from "@phosphor-icons/react"
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

function fmt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function AuditLogsClient({ rows }: { rows: AuditRow[] }) {
  const [q, setQ] = useState("")
  const [action, setAction] = useState("All")

  const actions = useMemo(() => ["All", ...[...new Set(rows.map((r) => r.action))].sort()], [rows])

  const filtered = rows.filter((r) => {
    if (action !== "All" && r.action !== action) return false
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return r.actor.toLowerCase().includes(s) || r.action.toLowerCase().includes(s) || (r.entityType ?? "").toLowerCase().includes(s) || r.payload.toLowerCase().includes(s)
  })

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Every administrative action — who did what, when, on which entity"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Entries (latest 200)" value={String(rows.length)} icon={<Scroll className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Distinct Actions" value={String(actions.length - 1)} icon={<Scroll className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="Showing" value={String(filtered.length)} icon={<Scroll className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" weight="duotone" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search actor, action, entity, payload…"
            className="w-full rounded-lg border border-zinc-800 bg-[#111113] pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-600"
          />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-[#111113] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-600"
        >
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
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
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-zinc-500">No matching log entries</td></tr>
              )}
              {filtered.map((r) => (
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
      </div>
    </div>
  )
}
