"use client"

import { CaretLeft, Wrench, CheckCircle, TrendUp, TrendDown, X } from "@phosphor-icons/react"

/* ---------- Page header ---------- */

export function PageHeader({ title, description, actions }: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-zinc-400">{description}</p>}
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
    indigo: "bg-blue-950/40 text-blue-400",
    emerald: "bg-emerald-950/40 text-emerald-400",
    amber: "bg-amber-950/40 text-amber-400",
    rose: "bg-rose-950/40 text-rose-400",
    sky: "bg-sky-950/40 text-sky-400",
    violet: "bg-violet-950/40 text-violet-400",
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111113] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-100 tabular-nums">{value}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${accents[accent]}`}>{icon}</div>
      </div>
      {delta && (
        <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${deltaUp ? "text-emerald-400" : "text-rose-400"}`}>
          {deltaUp ? <TrendUp className="h-3.5 w-3.5" weight="duotone" /> : <TrendDown className="h-3.5 w-3.5" weight="duotone" />}
          {delta}
          <span className="font-normal text-zinc-500">vs last month</span>
        </p>
      )}
    </div>
  )
}

/* ---------- Status badge ---------- */

export function statusBadgeClass(status: string): string {
  const styles: Record<string, string> = {
    active: "bg-emerald-950/50 text-emerald-300 border-emerald-800",
    verified: "bg-emerald-950/50 text-emerald-300 border-emerald-800",
    approved: "bg-emerald-950/50 text-emerald-300 border-emerald-800",
    published: "bg-emerald-950/50 text-emerald-300 border-emerald-800",
    resolved: "bg-emerald-950/50 text-emerald-300 border-emerald-800",
    paid: "bg-emerald-950/50 text-emerald-300 border-emerald-800",
    upcoming: "bg-sky-950/50 text-sky-300 border-sky-800",
    public: "bg-sky-950/50 text-sky-300 border-sky-800",
    pending: "bg-amber-950/50 text-amber-300 border-amber-800",
    review: "bg-amber-950/50 text-amber-300 border-amber-800",
    associate: "bg-amber-950/50 text-amber-300 border-amber-800",
    draft: "bg-zinc-800 text-zinc-300 border-zinc-700",
    past: "bg-zinc-800 text-zinc-300 border-zinc-700",
    free: "bg-zinc-800 text-zinc-300 border-zinc-700",
    student: "bg-zinc-800 text-zinc-300 border-zinc-700",
    archived: "bg-zinc-800 text-zinc-300 border-zinc-700",
    private: "bg-violet-950/50 text-violet-300 border-violet-800",
    premium: "bg-blue-950/50 text-blue-300 border-blue-800",
    life: "bg-amber-950/50 text-amber-300 border-amber-800",
    suspended: "bg-rose-950/50 text-rose-300 border-rose-800",
    rejected: "bg-rose-950/50 text-rose-300 border-rose-800",
    removed: "bg-rose-950/50 text-rose-300 border-rose-800",
    banned: "bg-rose-950/50 text-rose-300 border-rose-800",
    failed: "bg-rose-950/50 text-rose-300 border-rose-800",
    refunded: "bg-orange-950/50 text-orange-300 border-orange-800",
  }
  return styles[status] ?? "bg-zinc-800 text-zinc-300 border-zinc-700"
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(status)}`}>
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
      <a href="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-blue-400 mb-4">
        <CaretLeft className="h-3.5 w-3.5" weight="duotone" /> Back to Dashboard
      </a>
      <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-8 sm:p-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          {icon}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/50 border border-amber-800 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-300 mb-3">
          <Wrench className="h-3.5 w-3.5" weight="duotone" /> Coming Soon
        </div>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">{title}</h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">{description}</p>

        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-3">Planned capabilities</p>
          <ul className="space-y-2">
            {planned.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" weight="duotone" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          This module is on the roadmap. The navigation entry is reserved so the team can plan around it.
        </p>
      </div>
    </div>
  )
}

/* ---------- Simple SVG charts ---------- */

export function LineChart({ data, color = "#3b82f6", height = 120 }: { data: number[]; color?: string; height?: number }) {
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

export function BarChart({ data, labels, color = "#3b82f6" }: { data: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...data)
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full rounded-t-md transition-all hover:opacity-80" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: 4 }} />
          <span className="text-[10px] text-zinc-500 font-medium">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

export function ProgressBar({ value, max, color = "#3b82f6" }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-800">
      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} />
    </div>
  )
}

/* ---------- Button ---------- */

export function Button({ children, variant = "primary", size = "md", className = "", ...rest }: {
  children: React.ReactNode
  variant?: "primary" | "ghost" | "danger" | "subtle"
  size?: "sm" | "md"
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    ghost: "border border-zinc-700 text-zinc-200 hover:bg-zinc-800",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
    subtle: "text-zinc-300 hover:bg-zinc-800",
  }
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
  }
  return (
    <button
      className={`rounded-md font-medium inline-flex items-center gap-1.5 transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ---------- Section header ---------- */

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      {action}
    </div>
  )
}

/* ---------- Table primitives ---------- */

export function Table({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <table className={`w-full text-sm ${className}`}>{children}</table>
}

export function Thead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <thead className={className}>{children}</thead>
}

export function Tbody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tbody className={className}>{children}</tbody>
}

export function Tr({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tr className={`hover:bg-zinc-900/50 ${className}`}>{children}</tr>
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left text-[11px] uppercase tracking-wider text-zinc-500 font-medium py-2 px-3 ${className}`}>{children}</th>
}

export function Td({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`py-2.5 px-3 text-zinc-300 border-t border-zinc-800 ${className}`}>{children}</td>
}

/* ---------- Empty state ---------- */

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {icon && <div className="mb-3 text-zinc-600">{icon}</div>}
      <p className="text-sm font-semibold text-zinc-200">{title}</p>
      {description && <p className="mt-1 text-sm text-zinc-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------- Modal ---------- */

export function Modal({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative w-full max-w-lg rounded-xl border border-zinc-800 bg-[#111113] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>}
          <button
            aria-label="Close"
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" weight="duotone" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
