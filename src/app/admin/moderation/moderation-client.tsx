"use client"

import { useState, useTransition } from "react"
import {
  Flag, ChatCircle, FileText, UserMinus, Trash, EyeSlash, Check,
  Warning, ArrowSquareOut, CaretDown, CaretUp, X, Gavel,
} from "@phosphor-icons/react"
import { PageHeader, StatCard } from "../admin-ui"
import { resolveReportAction } from "./actions"

export interface ModReport {
  id: string
  entityType: string
  entityId: string
  reason: string
  details: string | null
  reporter: string
  time: string
}

type TypeFilter = "all" | "post" | "comment" | "profile" | "business" | "message"

const typeIcons: Record<string, React.ReactNode> = {
  post: <FileText className="h-4 w-4" weight="duotone" />,
  comment: <ChatCircle className="h-4 w-4" weight="duotone" />,
  profile: <UserMinus className="h-4 w-4" weight="duotone" />,
  business: <FileText className="h-4 w-4" weight="duotone" />,
  message: <ChatCircle className="h-4 w-4" weight="duotone" />,
}

const entityHref: Record<string, (id: string) => string | null> = {
  post: (id) => `/feed/${id}`,
  profile: () => null,
  comment: () => null,
  business: (id) => `/companies/${id}`,
  message: () => null,
}

export default function ModerationClient({
  reports, resolved30d,
}: { reports: ModReport[]; resolved30d: number }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [expanded, setExpanded] = useState<string | null>(reports[0]?.id ?? null)
  const [done, setDone] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const list = reports.filter((r) => !done[r.id] && (typeFilter === "all" || r.entityType === typeFilter))

  function act(id: string, res: "dismissed" | "warned" | "hidden" | "removed", label: string) {
    setError(null)
    startTransition(async () => {
      try {
        await resolveReportAction(id, res)
        setDone((d) => ({ ...d, [id]: label }))
        setExpanded(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed")
      }
    })
  }

  return (
    <div>
      <PageHeader
        title="Content Moderation"
        description="Review reported posts, comments, profiles, businesses, and messages"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Open Reports" value={String(list.length)} icon={<Flag className="h-4.5 w-4.5" weight="duotone" />} accent="rose" />
        <StatCard label="Resolved (30d)" value={String(resolved30d)} icon={<Check className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="In Queue" value={String(reports.length)} icon={<Gavel className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-900 bg-rose-950/40 px-4 py-2.5 text-xs font-semibold text-rose-300">{error}</div>
      )}

      <div className="flex gap-1.5 flex-wrap mb-4">
        {(["all", "post", "comment", "profile", "business", "message"] as TypeFilter[]).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold capitalize transition-colors ${typeFilter === t ? "border-blue-800 bg-blue-950/50 text-blue-300" : "border-zinc-800 bg-[#111113] text-zinc-500 hover:border-zinc-700"}`}>
            {t === "all" ? "All Types" : `${t}s`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-[#111113] py-16 text-center">
            <Gavel className="h-8 w-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
            <p className="text-sm font-medium text-zinc-400">Nothing to review</p>
            <p className="text-xs text-zinc-500 mt-1">No open reports{typeFilter !== "all" ? ` for ${typeFilter}s` : ""}</p>
          </div>
        )}

        {list.map((report) => {
          const isOpen = expanded === report.id
          const href = entityHref[report.entityType]?.(report.entityId) ?? null
          return (
            <div key={report.id} className="rounded-xl border border-zinc-800 bg-[#111113] overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : report.id)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-zinc-900/50 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 bg-zinc-800 text-zinc-400">
                  {typeIcons[report.entityType] ?? <Flag className="h-4 w-4" weight="duotone" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold capitalize text-zinc-400">{report.entityType}</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-100">{report.reason}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Reported by {report.reporter} · {report.time}</p>
                </div>
                {isOpen ? <CaretUp className="h-4 w-4 text-zinc-500 flex-shrink-0 mt-1" weight="duotone" /> : <CaretDown className="h-4 w-4 text-zinc-500 flex-shrink-0 mt-1" weight="duotone" />}
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800 p-4 sm:p-5">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Report detail</p>
                      {href && (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:underline">
                          <ArrowSquareOut className="h-3 w-3" weight="duotone" /> View in context
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300">{report.reason}</p>
                    {report.details && <p className="mt-2 text-xs text-zinc-400 whitespace-pre-wrap">{report.details}</p>}
                    <p className="mt-2 text-[11px] text-zinc-600 font-mono">{report.entityType}:{report.entityId}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => act(report.id, "removed", "Content removed")} disabled={pending}
                      className="flex items-center gap-1.5 rounded-md bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50">
                      <Trash className="h-3.5 w-3.5" weight="duotone" /> Remove
                    </button>
                    <button onClick={() => act(report.id, "hidden", "Content hidden")} disabled={pending}
                      className="flex items-center gap-1.5 rounded-md border border-amber-800 bg-amber-950/50 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-950 disabled:opacity-50">
                      <EyeSlash className="h-3.5 w-3.5" weight="duotone" /> Hide
                    </button>
                    <button onClick={() => act(report.id, "warned", "User warned")} disabled={pending}
                      className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3.5 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50">
                      <Warning className="h-3.5 w-3.5" weight="duotone" /> Warn
                    </button>
                    <button onClick={() => act(report.id, "dismissed", "Dismissed")} disabled={pending}
                      className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-50 ml-auto">
                      <X className="h-3.5 w-3.5" weight="duotone" /> Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
