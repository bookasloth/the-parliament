"use client"

import { useState } from "react"
import {
  Flag, ChatCircle, FileText, UserMinus, Trash, EyeSlash, Check,
  Warning, Clock, ShieldWarning, Prohibit, ArrowSquareOut,
  CaretDown, CaretUp, X, Gavel,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge } from "../admin-ui"

interface Report {
  id: string
  contentType: "post" | "comment" | "user" | "message"
  reason: string
  reasonCategory: "spam" | "harassment" | "misinformation" | "inappropriate" | "impersonation"
  reportedUser: string
  reportedUserBatch: string
  reporter: string
  contentPreview: string
  reportCount: number
  time: string
  status: "pending" | "resolved" | "dismissed"
  severity: "high" | "medium" | "low"
}

const reports: Report[] = [
  {
    id: "r1", contentType: "post", reason: "Promotional spam — repeatedly posting crypto investment links", reasonCategory: "spam",
    reportedUser: "Deepak Wankhede", reportedUserBatch: "2014", reporter: "Neha Gupta",
    contentPreview: "Guaranteed 10x returns!! Join my crypto trading group. Limited slots. DM me now or click bit.ly/...",
    reportCount: 5, time: "25 min ago", status: "pending", severity: "high",
  },
  {
    id: "r2", contentType: "comment", reason: "Harassment targeting a batchmate", reasonCategory: "harassment",
    reportedUser: "Anonymous User 4521", reportedUserBatch: "Unknown", reporter: "Priya Sharma",
    contentPreview: "You were always the teacher's pet and everyone hated you. Stop pretending you...",
    reportCount: 3, time: "1 hr ago", status: "pending", severity: "high",
  },
  {
    id: "r3", contentType: "post", reason: "Misinformation about NNAWCA membership fees", reasonCategory: "misinformation",
    reportedUser: "Rakesh Tiwari", reportedUserBatch: "2006", reporter: "Dr. Amit Verma",
    contentPreview: "BEWARE: The association is charging Rs 50,000 for life membership and pocketing the money...",
    reportCount: 2, time: "3 hrs ago", status: "pending", severity: "medium",
  },
  {
    id: "r4", contentType: "user", reason: "Impersonating a faculty member", reasonCategory: "impersonation",
    reportedUser: "Principal Sharma JNV", reportedUserBatch: "N/A", reporter: "Vikram Singh",
    contentPreview: "Profile claims to be the current principal of JNV Nagpur and is requesting donations via personal UPI.",
    reportCount: 7, time: "5 hrs ago", status: "pending", severity: "high",
  },
  {
    id: "r5", contentType: "comment", reason: "Inappropriate language in group discussion", reasonCategory: "inappropriate",
    reportedUser: "Sagar Pawar", reportedUserBatch: "2015", reporter: "Sunita Patel",
    contentPreview: "[comment removed from preview due to profanity] ...and that's why your batch was the worst...",
    reportCount: 1, time: "Yesterday", status: "pending", severity: "low",
  },
  {
    id: "r6", contentType: "post", reason: "Off-topic political content", reasonCategory: "inappropriate",
    reportedUser: "Mahesh Gawande", reportedUserBatch: "2004", reporter: "System (auto-flag)",
    contentPreview: "Everyone must vote for ... in the upcoming municipal elections, anyone who doesn't is...",
    reportCount: 4, time: "Yesterday", status: "resolved", severity: "medium",
  },
  {
    id: "r7", contentType: "message", reason: "Unsolicited business solicitation via DM", reasonCategory: "spam",
    reportedUser: "Nilesh Jadhav", reportedUserBatch: "2012", reporter: "Kavya Reddy",
    contentPreview: "Hi! I noticed you are an alumni. I sell insurance policies with special alumni discounts...",
    reportCount: 2, time: "2 days ago", status: "dismissed", severity: "low",
  },
]

const severityPill: Record<string, string> = {
  high: "bg-rose-950/50 text-rose-300 border-rose-800",
  medium: "bg-amber-950/50 text-amber-300 border-amber-800",
  low: "bg-zinc-800 text-zinc-300 border-zinc-700",
}

const severityIconBox: Record<string, string> = {
  high: "bg-rose-950/40 text-rose-400",
  medium: "bg-amber-950/40 text-amber-400",
  low: "bg-zinc-800 text-zinc-400",
}

const typeIcons: Record<string, React.ReactNode> = {
  post: <FileText className="h-4 w-4" weight="duotone" />,
  comment: <ChatCircle className="h-4 w-4" weight="duotone" />,
  user: <UserMinus className="h-4 w-4" weight="duotone" />,
  message: <ChatCircle className="h-4 w-4" weight="duotone" />,
}

type Tab = "pending" | "resolved" | "dismissed"
type TypeFilter = "all" | "post" | "comment" | "user" | "message"

export default function AdminModerationPage() {
  const [tab, setTab] = useState<Tab>("pending")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [expanded, setExpanded] = useState<string | null>("r1")
  const [decisions, setDecisions] = useState<Record<string, "resolved" | "dismissed" | undefined>>({})
  const [actionTaken, setActionTaken] = useState<Record<string, string>>({})

  const list = reports.filter(r => {
    const status = decisions[r.id] ?? r.status
    if (status !== tab) return false
    if (typeFilter !== "all" && r.contentType !== typeFilter) return false
    return true
  })

  function resolve(id: string, action: string) {
    setDecisions(d => ({ ...d, [id]: "resolved" }))
    setActionTaken(a => ({ ...a, [id]: action }))
    setExpanded(null)
  }

  function dismiss(id: string) {
    setDecisions(d => ({ ...d, [id]: "dismissed" }))
    setExpanded(null)
  }

  const pendingCount = reports.filter(r => (decisions[r.id] ?? r.status) === "pending").length

  return (
    <div>
      <PageHeader
        title="Content Moderation"
        description="Review reported posts, comments, users, and messages"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Open Reports" value={String(pendingCount)} icon={<Flag className="h-4.5 w-4.5" weight="duotone" />} accent="rose" />
        <StatCard label="High Severity" value={String(reports.filter(r => (decisions[r.id] ?? r.status) === "pending" && r.severity === "high").length)} icon={<ShieldWarning className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Resolved (30d)" value="42" icon={<Check className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Avg Resolution" value="6.8 hrs" icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
      </div>

      {/* Tabs + type filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-[#111113] p-1 w-fit">
          {(["pending", "resolved", "dismissed"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t}
              {t === "pending" && pendingCount > 0 && <span className="ml-1.5 rounded-full bg-rose-500 text-white px-1.5 text-[10px] font-bold">{pendingCount}</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap sm:ml-auto">
          {(["all", "post", "comment", "user", "message"] as TypeFilter[]).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold capitalize transition-colors ${typeFilter === t ? "border-blue-800 bg-blue-950/50 text-blue-300" : "border-zinc-800 bg-[#111113] text-zinc-500 hover:border-zinc-700"}`}>
              {t === "all" ? "All Types" : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Report list */}
      <div className="space-y-3">
        {list.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-[#111113] py-16 text-center">
            <Gavel className="h-8 w-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
            <p className="text-sm font-medium text-zinc-400">Nothing to review</p>
            <p className="text-xs text-zinc-500 mt-1">No {tab} reports{typeFilter !== "all" ? ` for ${typeFilter}s` : ""}</p>
          </div>
        )}

        {list.map(report => {
          const isOpen = expanded === report.id
          const status = decisions[report.id] ?? report.status
          return (
            <div key={report.id} className={`rounded-xl border bg-[#111113] overflow-hidden ${report.severity === "high" && status === "pending" ? "border-rose-800" : "border-zinc-800"}`}>
              <button onClick={() => setExpanded(isOpen ? null : report.id)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-zinc-900/50 transition-colors">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${severityIconBox[report.severity]}`}>
                  {typeIcons[report.contentType]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${severityPill[report.severity]}`}>{report.severity}</span>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold capitalize text-zinc-400">{report.contentType}</span>
                    <span className="rounded-full bg-violet-950/50 border border-violet-800 px-2 py-0.5 text-[10px] font-semibold capitalize text-violet-300">{report.reasonCategory}</span>
                    {report.reportCount > 1 && (
                      <span className="text-[10px] font-bold text-rose-400">{report.reportCount} reports</span>
                    )}
                    {status !== "pending" && <StatusBadge status={status} />}
                  </div>
                  <p className="text-sm font-semibold text-zinc-100">{report.reason}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Against <span className="font-semibold text-zinc-300">{report.reportedUser}</span> · reported by {report.reporter} · {report.time}
                  </p>
                </div>
                {isOpen ? <CaretUp className="h-4 w-4 text-zinc-500 flex-shrink-0 mt-1" weight="duotone" /> : <CaretDown className="h-4 w-4 text-zinc-500 flex-shrink-0 mt-1" weight="duotone" />}
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800 p-4 sm:p-5">
                  {/* Content preview */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Reported content</p>
                      <button className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:underline">
                        <ArrowSquareOut className="h-3 w-3" weight="duotone" /> View in context
                      </button>
                    </div>
                    <p className="text-sm text-zinc-300 italic">&ldquo;{report.contentPreview}&rdquo;</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Author: <span className="font-semibold text-zinc-300">{report.reportedUser}</span>
                      {report.reportedUserBatch !== "N/A" && report.reportedUserBatch !== "Unknown" && ` (Batch ${report.reportedUserBatch})`}
                    </p>
                  </div>

                  {actionTaken[report.id] && (
                    <div className="rounded-lg bg-emerald-950/50 border border-emerald-800 p-3 mb-4 text-xs font-semibold text-emerald-300 flex items-center gap-2">
                      <Check className="h-4 w-4" weight="duotone" /> Action taken: {actionTaken[report.id]}
                    </div>
                  )}

                  {/* Actions */}
                  {status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => resolve(report.id, "Content removed")}
                        className="flex items-center gap-1.5 rounded-md bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-500">
                        <Trash className="h-3.5 w-3.5" weight="duotone" /> Remove Content
                      </button>
                      <button onClick={() => resolve(report.id, "Content hidden pending appeal")}
                        className="flex items-center gap-1.5 rounded-md border border-amber-800 bg-amber-950/50 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-950">
                        <EyeSlash className="h-3.5 w-3.5" weight="duotone" /> Hide Content
                      </button>
                      <button onClick={() => resolve(report.id, "User warned (karma penalty applied)")}
                        className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3.5 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800">
                        <Warning className="h-3.5 w-3.5" weight="duotone" /> Warn User
                      </button>
                      <button onClick={() => resolve(report.id, "User suspended for 7 days")}
                        className="flex items-center gap-1.5 rounded-md border border-rose-800 px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/50">
                        <Prohibit className="h-3.5 w-3.5" weight="duotone" /> Suspend User
                      </button>
                      <button onClick={() => dismiss(report.id)}
                        className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 ml-auto">
                        <X className="h-3.5 w-3.5" weight="duotone" /> Dismiss Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
