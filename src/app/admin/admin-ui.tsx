"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState, useTransition } from "react"
import { CaretLeft, Wrench, CheckCircle, WarningCircle, TrendUp, TrendDown, X } from "@phosphor-icons/react"

/* ---------- Page header ---------- */

export function PageHeader({ title, description, actions }: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-gray-600">{description}</p>}
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
  // All accents intentionally render the same neutral grey badge — the console
  // reads calmer without per-tile colour. Keys kept so call sites need no change.
  const accents: Record<string, string> = {
    indigo: "bg-gray-100 text-gray-600",
    emerald: "bg-gray-100 text-gray-600",
    amber: "bg-gray-100 text-gray-600",
    rose: "bg-gray-100 text-gray-600",
    sky: "bg-gray-100 text-gray-600",
    violet: "bg-gray-100 text-gray-600",
  }
  return (
    <div className="rounded-[5px] border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-[4px] flex-shrink-0 ${accents[accent]}`}>{icon}</div>
      </div>
      {delta && (
        <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${deltaUp ? "text-emerald-600" : "text-rose-600"}`}>
          {deltaUp ? <TrendUp className="h-3.5 w-3.5" weight="duotone" /> : <TrendDown className="h-3.5 w-3.5" weight="duotone" />}
          {delta}
          <span className="font-normal text-gray-500">vs last month</span>
        </p>
      )}
    </div>
  )
}

/* ---------- Status badge ---------- */

export function statusBadgeClass(status: string): string {
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
    associate: "bg-amber-50 text-amber-700 border-amber-200",
    draft: "bg-gray-100 text-gray-700 border-gray-300",
    past: "bg-gray-100 text-gray-700 border-gray-300",
    free: "bg-gray-100 text-gray-700 border-gray-300",
    student: "bg-gray-100 text-gray-700 border-gray-300",
    archived: "bg-gray-100 text-gray-700 border-gray-300",
    private: "bg-violet-50 text-violet-700 border-violet-200",
    premium: "bg-blue-50 text-blue-700 border-blue-200",
    life: "bg-amber-50 text-amber-700 border-amber-200",
    suspended: "bg-rose-50 text-rose-700 border-rose-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    removed: "bg-rose-50 text-rose-700 border-rose-200",
    banned: "bg-rose-50 text-rose-700 border-rose-200",
    failed: "bg-rose-50 text-rose-700 border-rose-200",
    refunded: "bg-orange-50 text-orange-700 border-orange-200",
  }
  return styles[status] ?? "bg-gray-100 text-gray-700 border-gray-300"
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(status)}`}>
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
      <a href="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-blue-600 mb-4">
        <CaretLeft className="h-3.5 w-3.5" weight="duotone" /> Back to Dashboard
      </a>
      <div className="rounded-[5px] border border-gray-200 bg-white p-8 sm:p-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[5px] bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          {icon}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-[3px] bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-3">
          <Wrench className="h-3.5 w-3.5" weight="duotone" /> Coming Soon
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">{description}</p>

        <div className="rounded-[5px] bg-gray-100 border border-gray-200 p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Planned capabilities</p>
          <ul className="space-y-2">
            {planned.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" weight="duotone" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-xs text-gray-500">
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
          <span className="text-[10px] text-gray-500 font-medium">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

export function ProgressBar({ value, max, color = "#3b82f6" }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100">
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
    ghost: "border border-gray-300 text-gray-800 hover:bg-gray-100",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
    subtle: "text-gray-700 hover:bg-gray-100",
  }
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
  }
  return (
    <button
      className={`rounded-[3px] font-medium inline-flex items-center gap-1.5 transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ---------- Section header ---------- */

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
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
  return <tr className={`hover:bg-gray-50 ${className}`}>{children}</tr>
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium py-2 px-3 ${className}`}>{children}</th>
}

export function Td({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`py-2.5 px-3 text-gray-700 border-t border-gray-200 ${className}`}>{children}</td>
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
      {icon && <div className="mb-3 text-gray-400">{icon}</div>}
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------- Toasts ---------- */

type ToastKind = "success" | "error" | "info"
interface ToastItem { id: number; kind: ToastKind; msg: string }
interface ToastApi {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/**
 * Mount once (in AdminShell). Provides `useToast()` to every admin page.
 * Dark-themed to match the console; auto-dismisses each toast after 3.5s.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const remove = useCallback((id: number) => setItems(l => l.filter(t => t.id !== id)), [])
  const push = useCallback((kind: ToastKind, msg: string) => {
    const id = ++seq.current
    setItems(l => [...l, { id, kind, msg }])
    setTimeout(() => remove(id), 3500)
  }, [remove])

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,20rem)]">
        {items.map(t => {
          const tone = t.kind === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : t.kind === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-gray-300 bg-gray-100/95 text-gray-800"
          const Icon = t.kind === "error" ? WarningCircle : CheckCircle
          return (
            <div key={t.id} role="status"
              className={`flex items-start gap-2 rounded-[5px] border px-3.5 py-2.5 text-xs font-semibold shadow-lg backdrop-blur ${tone}`}>
              <Icon className="h-4 w-4 flex-shrink-0 mt-px" weight="duotone" />
              <span className="flex-1 min-w-0">{t.msg}</span>
              <button onClick={() => remove(t.id)} aria-label="Dismiss" className="text-current/60 hover:text-current">
                <X className="h-3.5 w-3.5" weight="duotone" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>")
  return ctx
}

/* ---------- Optimistic row action ---------- */

interface RowActionOpts {
  action: () => Promise<unknown>  // server call
  optimistic?: () => void          // apply local state change immediately
  revert?: () => void              // undo optimistic() if action throws
  success?: string                 // toast on success
  error?: string                   // toast override on failure (else thrown message)
}

/**
 * Per-row optimistic mutation. Applies the local change now, calls the server in
 * a transition, reverts + toasts on failure. `isBusy(id)` drives a single row's
 * spinner/disabled state — the rest of the page stays interactive.
 */
export function useRowAction() {
  const toast = useToast()
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const run = useCallback((id: string, opts: RowActionOpts) => {
    opts.optimistic?.()
    setBusy(s => new Set(s).add(id))
    startTransition(async () => {
      try {
        await opts.action()
        if (opts.success) toast.success(opts.success)
      } catch (e) {
        opts.revert?.()
        toast.error(opts.error ?? (e instanceof Error ? e.message : "Action failed"))
      } finally {
        setBusy(s => { const n = new Set(s); n.delete(id); return n })
      }
    })
  }, [toast])

  return { run, isBusy: (id: string) => busy.has(id) }
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
      <div className="relative w-full max-w-lg rounded-[5px] border border-gray-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
          <button
            aria-label="Close"
            onClick={onClose}
            className="ml-auto rounded-[3px] p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <X className="h-4 w-4" weight="duotone" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
