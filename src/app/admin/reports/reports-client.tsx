"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Flag, Warning, User, ShieldCheck } from "@phosphor-icons/react"
import { PageHeader, StatCard, Button, Table, Thead, Tbody, Tr, Th, Td, EmptyState, Modal, useRowAction } from "../admin-ui"
import { assignClusterAction, resolveClusterAction } from "./actions"

export interface ReportRow {
  entityType: string
  entityId: string
  reportCount: number
  reasons: string[]
  reporters: string[]
  firstAt: string
  lastAt: string
  assignee: string | null
  assignedToMe: boolean
}

export interface ReportStats {
  openClusters: number
  totalReports: number
  unassigned: number
  assignedToMe: number
}

const RESOLUTIONS = ["dismissed", "warned", "hidden", "removed"] as const

// ponytail: inline relative-time; server-only date helpers can't cross the client boundary.
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const rowKey = (r: Pick<ReportRow, "entityType" | "entityId">) => `${r.entityType}:${r.entityId}`

export default function ReportsClient({ clusters, stats }: { clusters: ReportRow[]; stats: ReportStats }) {
  const router = useRouter()
  const { run, isBusy } = useRowAction()
  const [active, setActive] = useState<ReportRow | null>(null)
  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]>("dismissed")
  const [notes, setNotes] = useState("")
  // Optimistic overlays keyed by rowKey — resolved rows drop out, claim/release toggles flip instantly.
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [overrides, setOverrides] = useState<Record<string, Partial<ReportRow>>>({})

  const rows = clusters
    .filter((r) => !removed.has(rowKey(r)))
    .map((r) => (overrides[rowKey(r)] ? { ...r, ...overrides[rowKey(r)] } : r))

  function openResolve(row: ReportRow) {
    setActive(row)
    setResolution("dismissed")
    setNotes("")
  }

  function assign(row: ReportRow, claim: boolean) {
    const key = rowKey(row)
    const prev = overrides[key]
    run(key, {
      // Flip ownership locally; server recomputes the real assignee name + stats, so keep refresh.
      optimistic: () => setOverrides((o) => ({ ...o, [key]: { assignedToMe: claim, assignee: claim ? row.assignee : null } })),
      revert: () => setOverrides((o) => { const n = { ...o }; if (prev) n[key] = prev; else delete n[key]; return n }),
      action: async () => { await assignClusterAction(row.entityType, row.entityId, claim); router.refresh() },
    })
  }

  function submitResolve() {
    if (!active || notes.trim().length < 3) return
    const row = active
    const key = rowKey(row)
    setActive(null)
    run(key, {
      optimistic: () => setRemoved((s) => new Set(s).add(key)),
      revert: () => setRemoved((s) => { const n = new Set(s); n.delete(key); return n }),
      // Server recomputes stat cards; refresh keeps them accurate after the row drops.
      action: async () => { await resolveClusterAction({ entityType: row.entityType, entityId: row.entityId, resolution, notes }); router.refresh() },
      success: `Resolved ${row.reportCount} report${row.reportCount === 1 ? "" : "s"} on this ${row.entityType}.`,
    })
  }

  return (
    <div>
      <PageHeader title="Report Queue" description="Clustered content reports — one row per reported entity" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Open Clusters" value={String(stats.openClusters)} icon={<Flag className="h-4.5 w-4.5" weight="duotone" />} accent="rose" />
        <StatCard label="Total Reports" value={String(stats.totalReports)} icon={<Warning className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Unassigned" value={String(stats.unassigned)} icon={<User className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="Assigned to me" value={String(stats.assignedToMe)} icon={<ShieldCheck className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[4px] border border-gray-200 bg-white">
          <EmptyState icon={<ShieldCheck className="h-8 w-8" weight="duotone" />} title="Queue clear" description="No open content reports right now." />
        </div>
      ) : (
        <div className="rounded-[4px] border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr className="hover:bg-transparent">
                  <Th>Entity</Th>
                  <Th>Reports</Th>
                  <Th>Reasons</Th>
                  <Th>Reporters</Th>
                  <Th>Age</Th>
                  <Th>Assignee</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row) => (
                  <Tr key={rowKey(row)}>
                    <Td className="whitespace-nowrap">
                      <span className="rounded-[3px] bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700">{row.entityType}</span>
                      <span className="ml-2 font-mono text-[11px] text-gray-500">{row.entityId.slice(0, 8)}</span>
                    </Td>
                    <Td>
                      <span className={`inline-flex min-w-[1.5rem] justify-center rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold ${row.reportCount > 1 ? "bg-rose-50/60 text-rose-700" : "bg-gray-100 text-gray-600"}`}>
                        {row.reportCount}
                      </span>
                    </Td>
                    <Td className="max-w-[220px] text-gray-600">
                      <span className="block truncate" title={row.reasons.join(", ")}>{row.reasons.join(", ")}</span>
                    </Td>
                    <Td className="whitespace-nowrap text-gray-600">
                      {row.reporters.slice(0, 2).join(", ")}
                      {row.reporters.length > 2 && <span className="text-gray-400"> +{row.reporters.length - 2}</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-500">{timeAgo(row.firstAt)}</Td>
                    <Td className="whitespace-nowrap text-gray-600">
                      {row.assignee ?? "—"}
                      {row.assignedToMe && <span className="ml-1.5 rounded-[3px] bg-emerald-50/60 px-1 py-0.5 text-[10px] text-emerald-600">you</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {row.assignedToMe ? (
                          <Button variant="ghost" size="sm" disabled={isBusy(rowKey(row))} onClick={() => assign(row, false)}>Release</Button>
                        ) : !row.assignee ? (
                          <Button variant="ghost" size="sm" disabled={isBusy(rowKey(row))} onClick={() => assign(row, true)}>Claim</Button>
                        ) : null}
                        <Button variant="primary" size="sm" disabled={isBusy(rowKey(row))} onClick={() => openResolve(row)}>Resolve</Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </div>
      )}

      <Modal open={!!active} onClose={() => setActive(null)} title="Resolve report cluster">
        {active && (
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Resolving <span className="font-medium text-gray-800">{active.reportCount}</span> open report
              {active.reportCount === 1 ? "" : "s"} on{" "}
              <span className="rounded-[3px] bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">{active.entityType}</span>{" "}
              <span className="font-mono text-[11px] text-gray-500">{active.entityId.slice(0, 8)}</span>.
            </p>

            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as (typeof RESOLUTIONS)[number])}
                className="w-full rounded-[4px] border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-600"
              >
                {RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-gray-500">Notes (required)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Why this resolution? (min 3 characters)"
                className="w-full rounded-[4px] border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActive(null)}>Cancel</Button>
              <Button variant="primary" size="sm" disabled={isBusy(rowKey(active)) || notes.trim().length < 3} onClick={submitResolve}>
                Resolve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
