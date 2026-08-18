"use client"

import { useState } from "react"
import {
  Flag, ChatCircle, FileText, UserMinus, Trash, EyeSlash, Check,
  Warning, ArrowSquareOut, CaretDown, CaretUp, X, Gavel,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, useRowAction } from "../admin-ui"
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
  const { run, isBusy } = useRowAction()

  const list = reports.filter((r) => !done[r.id] && (typeFilter === "all" || r.entityType === typeFilter))

  function act(id: string, res: "dismissed" | "warned" | "hidden" | "removed", label: string) {
    run(id, {
      optimistic: () => { setDone((d) => ({ ...d, [id]: label })); setExpanded(null) },
      revert: () => setDone((d) => { const n = { ...d }; delete n[id]; return n }),
      action: () => resolveReportAction(id, res),
      success: label,
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

      <div className="flex gap-1.5 flex-wrap mb-4">
        {(["all", "post", "comment", "profile", "business", "message"] as TypeFilter[]).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`rounded-[3px] border px-3 py-1 text-[11px] font-semibold capitalize transition-colors ${typeFilter === t ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
            {t === "all" ? "All Types" : `${t}s`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="rounded-[5px] border border-gray-200 bg-white py-16 text-center">
            <Gavel className="h-8 w-8 text-gray-400 mx-auto mb-2" weight="duotone" />
            <p className="text-sm font-medium text-gray-600">Nothing to review</p>
            <p className="text-xs text-gray-500 mt-1">No open reports{typeFilter !== "all" ? ` for ${typeFilter}s` : ""}</p>
          </div>
        )}

        {list.map((report) => {
          const isOpen = expanded === report.id
          const href = entityHref[report.entityType]?.(report.entityId) ?? null
          return (
            <div key={report.id} className="rounded-[5px] border border-gray-200 bg-white overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : report.id)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-[4px] flex-shrink-0 bg-gray-100 text-gray-600">
                  {typeIcons[report.entityType] ?? <Flag className="h-4 w-4" weight="duotone" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="rounded-[3px] bg-gray-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-gray-600">{report.entityType}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{report.reason}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reported by {report.reporter} · {report.time}</p>
                </div>
                {isOpen ? <CaretUp className="h-4 w-4 text-gray-500 flex-shrink-0 mt-1" weight="duotone" /> : <CaretDown className="h-4 w-4 text-gray-500 flex-shrink-0 mt-1" weight="duotone" />}
              </button>

              {isOpen && (
                <div className="border-t border-gray-200 p-4 sm:p-5">
                  <div className="rounded-[4px] border border-gray-200 bg-gray-100 p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Report detail</p>
                      {href && (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">
                          <ArrowSquareOut className="h-3 w-3" weight="duotone" /> View in context
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{report.reason}</p>
                    {report.details && <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">{report.details}</p>}
                    <p className="mt-2 text-[11px] text-gray-400 font-mono">{report.entityType}:{report.entityId}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => act(report.id, "removed", "Content removed")} disabled={isBusy(report.id)}
                      className="flex items-center gap-1.5 rounded-[3px] bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50">
                      <Trash className="h-3.5 w-3.5" weight="duotone" /> Remove
                    </button>
                    <button onClick={() => act(report.id, "hidden", "Content hidden")} disabled={isBusy(report.id)}
                      className="flex items-center gap-1.5 rounded-[3px] border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                      <EyeSlash className="h-3.5 w-3.5" weight="duotone" /> Hide
                    </button>
                    <button onClick={() => act(report.id, "warned", "User warned")} disabled={isBusy(report.id)}
                      className="flex items-center gap-1.5 rounded-[3px] border border-gray-300 px-3.5 py-2 text-xs font-bold text-gray-800 hover:bg-gray-100 disabled:opacity-50">
                      <Warning className="h-3.5 w-3.5" weight="duotone" /> Warn
                    </button>
                    <button onClick={() => act(report.id, "dismissed", "Dismissed")} disabled={isBusy(report.id)}
                      className="flex items-center gap-1.5 rounded-[3px] border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 ml-auto">
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
