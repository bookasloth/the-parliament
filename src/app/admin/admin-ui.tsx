"use client"

import { TrendingUp, TrendingDown, Construction, ChevronLeft, CheckCircle2 } from "lucide-react"

/* ---------- Page header ---------- */

export function PageHeader({ title, description, actions }: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}

/* ---------- Stat card ---------- */

export function StatCard({ label, value, delta, deltaUp, icon, accent = "indigo" }: {
  label: string
  value: string
  delta?: string
  deltaUp?: boolean
  icon: React.ReactNode
  accent?: "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet"
}) {
  const accents: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${accents[accent]}`}>{icon}</div>
      </div>
      {delta && (
        <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${deltaUp ? "text-emerald-600" : "text-rose-500"}`}>
          {deltaUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {delta}
          <span className="font-normal text-slate-400">vs last month</span>
        </p>
      )}
    </div>
  )
}

/* ---------- Status badge ---------- */

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    upcoming: "bg-sky-50 text-sky-700 border-sky-200",
    public: "bg-sky-50 text-sky-700 border-sky-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    review: "bg-amber-50 text-amber-700 border-amber-200",
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    past: "bg-slate-100 text-slate-600 border-slate-200",
    free: "bg-slate-100 text-slate-600 border-slate-200",
    archived: "bg-slate-100 text-slate-600 border-slate-200",
    private: "bg-violet-50 text-violet-700 border-violet-200",
    premium: "bg-indigo-50 text-indigo-700 border-indigo-200",
    associate: "bg-amber-50 text-amber-700 border-amber-200",
    life: "bg-yellow-50 text-yellow-700 border-yellow-300",
    suspended: "bg-rose-50 text-rose-700 border-rose-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    removed: "bg-rose-50 text-rose-700 border-rose-200",
    banned: "bg-rose-50 text-rose-700 border-rose-200",
    failed: "bg-rose-50 text-rose-700 border-rose-200",
    refunded: "bg-orange-50 text-orange-700 border-orange-200",
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${styles[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  )
}

/* ---------- Coming soon (future modules) ---------- */

export function ComingSoon({ title, description, icon, planned }: {
  title: string
  description: string
  icon: React.ReactNode
  planned: string[]
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <a href="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-4">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Dashboard
      </a>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          {icon}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-3">
          <Construction className="h-3.5 w-3.5" /> Coming Soon
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">{description}</p>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Planned capabilities</p>
          <ul className="space-y-2">
            {planned.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          This module is on the roadmap. The navigation entry is reserved so the team can plan around it.
        </p>
      </div>
    </div>
  )
}

/* ---------- Simple SVG charts ---------- */

export function LineChart({ data, color = "#6366f1", height = 120 }: { data: number[]; color?: string; height?: number }) {
  const w = 600
  const max = Math.max(...data) * 1.1
  const min = Math.min(...data) * 0.9
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / (max - min)) * height}`)
  const path = `M${pts.join(" L")}`
  return (
    <svg viewBox={`0 0 ${w} ${height + 4}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${w},${height + 4} L0,${height + 4} Z`} fill={`url(#grad-${color.replace("#", "")})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BarChart({ data, labels, color = "#6366f1" }: { data: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...data)
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full rounded-t-md transition-all hover:opacity-80" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: 4 }} />
          <span className="text-[10px] text-slate-400 font-medium">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

export function ProgressBar({ value, max, color = "#6366f1" }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} />
    </div>
  )
}
