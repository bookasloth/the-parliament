"use client"

import { useState, useTransition } from "react"
import {
  CreditCard, CurrencyInr, TrendUp, Users, MagnifyingGlass, Clock,
  Envelope, ArrowCounterClockwise,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, ProgressBar } from "../admin-ui"
import { refundOrderAction } from "./actions"

export interface TxRow {
  id: string
  user: string
  email: string
  plan: string
  amountInr: number
  status: string
  date: string
  refundable: boolean
}

export interface PlanRow { plan: string; count: number; pct: number }

interface Stats { totalActive: number; mrrInr: number; lifetimeInr: number; expiring30d: number }

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

export default function MembershipClient({
  transactions, plans, stats,
}: { transactions: TxRow[]; plans: PlanRow[]; stats: Stats }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [blasting, setBlasting] = useState(false)
  const [refunded, setRefunded] = useState<Record<string, true>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function sendActivation(force = false): Promise<void> {
    const msg = force
      ? "Force-send account-activation emails NOW to every member without a password?"
      : "Send account-activation emails? (Scheduled — will be refused before the send date.)"
    if (!confirm(msg)) return
    setBlasting(true)
    const res = await fetch("/api/admin/activation-blast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    })
    const data = await res.json().catch(() => ({}))
    setBlasting(false)
    if (!res.ok) {
      if (confirm((data.error ?? "Failed") + "\n\nForce-send now instead?")) return sendActivation(true)
      return
    }
    alert(`Activation emails: ${data.sent} sent, ${data.failed} failed (of ${data.targeted} members).`)
  }

  function refund(t: TxRow) {
    const reason = prompt(`Refund ${inr(t.amountInr)} to ${t.user}?\nThis issues a real Razorpay refund. Enter a reason:`)
    if (!reason || reason.trim().length < 3) return
    setError(null)
    startTransition(async () => {
      try {
        await refundOrderAction(t.id, reason)
        setRefunded((r) => ({ ...r, [t.id]: true }))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Refund failed")
      }
    })
  }

  const filtered = transactions.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false
    if (search && !t.user.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase()) && !t.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statuses = ["all", ...[...new Set(transactions.map((t) => t.status))]]

  return (
    <div>
      <PageHeader
        title="Membership & Payments"
        description="Track revenue, plan distribution, and transactions"
        actions={
          <button onClick={() => sendActivation()} disabled={blasting}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
            <Envelope className="h-3.5 w-3.5" weight="duotone" /> {blasting ? "Sending…" : "Send activation emails"}
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-rose-900 bg-rose-950/40 px-4 py-2.5 text-xs font-semibold text-rose-300">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Active Members" value={stats.totalActive.toLocaleString("en-IN")} icon={<Users className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Est. MRR" value={inr(stats.mrrInr)} icon={<TrendUp className="h-4.5 w-4.5" weight="duotone" />} accent="violet" />
        <StatCard label="Lifetime Collected" value={inr(stats.lifetimeInr)} icon={<CurrencyInr className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Expiring (30d)" value={String(stats.expiring30d)} icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
      </div>

      {/* Plan distribution */}
      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-4 sm:p-5 mb-5">
        <h2 className="text-sm font-bold text-zinc-100 mb-4">Active Plan Distribution</h2>
        {plans.length === 0 ? (
          <p className="text-xs text-zinc-500">No active memberships yet.</p>
        ) : (
          <div className="space-y-3.5">
            {plans.map((p) => (
              <div key={p.plan}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-zinc-300">{p.plan}</span>
                  <span className="text-xs text-zinc-500 tabular-nums">{p.count.toLocaleString("en-IN")} · {p.pct}%</span>
                </div>
                <ProgressBar value={p.count} max={plans.reduce((a, x) => a + x.count, 0)} color="#6366f1" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="rounded-xl border border-zinc-800 bg-[#111113] overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-100 self-center mr-auto px-1">Orders</h2>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-zinc-800 bg-[#111113] text-zinc-200 px-2.5 py-2 text-xs outline-none focus:border-blue-500 capitalize">
            {statuses.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
          </select>
          <div className="relative sm:w-64">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" weight="duotone" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, ID…"
              className="w-full rounded-md border border-zinc-800 bg-[#0a0a0a] pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-left">
                {["Order ID", "Member", "Plan", "Amount", "Status", "Date", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const isRefunded = refunded[t.id] || t.status === "refunded"
                return (
                  <tr key={t.id} className="hover:bg-zinc-900/50 border-t border-zinc-800">
                    <td className="px-4 py-3 text-xs font-mono text-zinc-500 whitespace-nowrap">{t.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-semibold text-zinc-200">{t.user}</p>
                      <p className="text-[11px] text-zinc-500">{t.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{t.plan}</td>
                    <td className="px-4 py-3 text-xs font-bold text-zinc-200 tabular-nums whitespace-nowrap">{inr(t.amountInr)}</td>
                    <td className="px-4 py-3"><StatusBadge status={isRefunded ? "refunded" : t.status} /></td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{fmtDate(t.date)}</td>
                    <td className="px-4 py-3">
                      {t.refundable && !isRefunded && (
                        <button onClick={() => refund(t)} disabled={pending} title="Issue refund"
                          className="flex items-center gap-1 rounded-md border border-amber-800 bg-amber-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-950 disabled:opacity-50">
                          <ArrowCounterClockwise className="h-3 w-3" weight="duotone" /> Refund
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <CreditCard className="h-8 w-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
                    <p className="text-sm font-medium text-zinc-400">No orders found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
