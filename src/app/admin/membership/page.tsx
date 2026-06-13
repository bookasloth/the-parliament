"use client"

import { useState } from "react"
import {
  CreditCard, IndianRupee, TrendingUp, Users, Search, Download,
  RefreshCcw, CheckCircle2, XCircle, Crown, Star, Shield, Heart,
  MoreHorizontal, Receipt, Mail, Pencil,
} from "lucide-react"
import { PageHeader, StatCard, StatusBadge, LineChart, ProgressBar } from "../admin-ui"

const revenueTrend = [22400, 25100, 28900, 31200, 29800, 35600, 38200, 41500, 39900, 44100, 46800, 48200]

const planDistribution = [
  { plan: "Free", count: 1647, color: "#94a3b8", icon: <Heart className="h-3.5 w-3.5" /> },
  { plan: "Associate", count: 612, color: "#f59e0b", icon: <Star className="h-3.5 w-3.5" /> },
  { plan: "Premium", count: 478, color: "#6366f1", icon: <Shield className="h-3.5 w-3.5" /> },
  { plan: "Life Member", count: 110, color: "#eab308", icon: <Crown className="h-3.5 w-3.5" /> },
]

interface Transaction {
  id: string
  user: string
  email: string
  plan: string
  amount: string
  method: string
  status: "paid" | "failed" | "refunded" | "pending"
  date: string
}

const transactions: Transaction[] = [
  { id: "PAY-7841", user: "Dr. Amit Verma", email: "amit.verma@gmail.com", plan: "Life Member", amount: "Rs 9,999", method: "UPI", status: "paid", date: "Jun 13, 2026 10:42 AM" },
  { id: "PAY-7840", user: "Priya Sharma", email: "priya.s@outlook.com", plan: "Associate (Annual)", amount: "Rs 799", method: "Card", status: "paid", date: "Jun 13, 2026 9:15 AM" },
  { id: "PAY-7839", user: "Vikram Singh", email: "vikram.singh@gmail.com", plan: "Premium (Annual)", amount: "Rs 2,499", method: "UPI", status: "paid", date: "Jun 12, 2026" },
  { id: "PAY-7838", user: "Rahul Mehta", email: "rahul.mehta@gmail.com", plan: "Premium (Monthly)", amount: "Rs 299", method: "Card", status: "failed", date: "Jun 12, 2026" },
  { id: "PAY-7837", user: "Sunita Patel", email: "sunita.p@gmail.com", plan: "Associate (Annual)", amount: "Rs 799", method: "Net Banking", status: "refunded", date: "Jun 11, 2026" },
  { id: "PAY-7836", user: "Kavya Reddy", email: "kavya.r@gmail.com", plan: "Premium (Annual)", amount: "Rs 2,499", method: "UPI", status: "paid", date: "Jun 11, 2026" },
  { id: "PAY-7835", user: "Arjun Nair", email: "arjun.n@gmail.com", plan: "Associate (Monthly)", amount: "Rs 99", method: "UPI", status: "pending", date: "Jun 10, 2026" },
  { id: "PAY-7834", user: "Neha Gupta", email: "neha.gupta@gmail.com", plan: "Premium (Annual)", amount: "Rs 2,499", method: "Card", status: "paid", date: "Jun 10, 2026" },
]

const refundRequests = [
  { id: "RF-101", user: "Sunita Patel", plan: "Associate (Annual)", amount: "Rs 799", reason: "Purchased by mistake, meant to buy monthly plan", time: "2 days ago" },
  { id: "RF-102", user: "Mohan Bhagat", plan: "Premium (Monthly)", amount: "Rs 299", reason: "Features not working as expected on mobile", time: "3 days ago" },
  { id: "RF-103", user: "Rina Thakur", plan: "Associate (Annual)", amount: "Rs 799", reason: "Duplicate charge on card statement", time: "4 days ago" },
]

const plans = [
  { name: "Associate", monthly: "Rs 99", annual: "Rs 799", subscribers: 612, color: "#f59e0b" },
  { name: "Premium", monthly: "Rs 299", annual: "Rs 2,499", subscribers: 478, color: "#6366f1" },
  { name: "Life Member", monthly: "—", annual: "Rs 9,999 one-time", subscribers: 110, color: "#eab308" },
]

export default function AdminMembershipPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [refundDecisions, setRefundDecisions] = useState<Record<string, "approved" | "rejected">>({})

  const totalMembers = planDistribution.reduce((a, p) => a + p.count, 0)

  const filteredTx = transactions.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false
    if (search && !t.user.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const openRefunds = refundRequests.filter(r => !refundDecisions[r.id])

  return (
    <div>
      <PageHeader
        title="Membership & Payments"
        description="Track revenue, manage plans, and handle transactions"
        actions={
          <>
            <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <RefreshCcw className="h-3.5 w-3.5" /> Sync Razorpay
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Revenue (MTD)" value="Rs 48.2k" delta="+18.9%" deltaUp icon={<IndianRupee className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="Paid Members" value="1,200" delta="+6.4%" deltaUp icon={<Users className="h-4.5 w-4.5" />} accent="indigo" />
        <StatCard label="MRR" value="Rs 1.18L" delta="+11.2%" deltaUp icon={<TrendingUp className="h-4.5 w-4.5" />} accent="violet" />
        <StatCard label="Failed Payments (7d)" value="9" delta="-2" deltaUp icon={<XCircle className="h-4.5 w-4.5" />} accent="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        {/* Revenue chart */}
        <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-900">Monthly Revenue</h2>
            <span className="text-xs text-slate-400">Last 12 months</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            <span className="font-bold text-emerald-600">Rs 4.32L total</span> collected this year
          </p>
          <LineChart data={revenueTrend} color="#10b981" height={140} />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>Jul</span><span>Sep</span><span>Nov</span><span>Jan</span><span>Mar</span><span>Jun</span>
          </div>
        </div>

        {/* Plan distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Plan Distribution</h2>
          <div className="space-y-3.5">
            {planDistribution.map(p => (
              <div key={p.plan}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <span style={{ color: p.color }}>{p.icon}</span> {p.plan}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {p.count.toLocaleString()} <span className="text-slate-300">·</span> {Math.round((p.count / totalMembers) * 100)}%
                  </span>
                </div>
                <ProgressBar value={p.count} max={totalMembers} color={p.color} />
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
            <p className="text-[11px] text-slate-400">Conversion rate (free to paid)</p>
            <p className="text-lg font-bold text-indigo-600">42.2%</p>
          </div>
        </div>
      </div>

      {/* Refund requests */}
      {openRefunds.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-white overflow-hidden mb-5">
          <div className="px-4 sm:px-5 py-3.5 border-b border-amber-100 bg-amber-50/60">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-500" /> Refund Requests
              <span className="rounded-full bg-amber-400 text-amber-900 px-1.5 text-[10px] font-bold">{openRefunds.length}</span>
            </h2>
          </div>
          <ul className="divide-y divide-slate-50">
            {openRefunds.map(r => (
              <li key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800">
                    {r.user} <span className="font-normal text-slate-400">· {r.plan} · <span className="font-bold text-slate-700">{r.amount}</span></span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 italic">"{r.reason}"</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{r.id} · {r.time}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setRefundDecisions(d => ({ ...d, [r.id]: "approved" }))}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Approve Refund
                  </button>
                  <button onClick={() => setRefundDecisions(d => ({ ...d, [r.id]: "rejected" }))}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                    <XCircle className="h-3 w-3" /> Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Plan config */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-5">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Plan Configuration</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {plans.map(p => (
            <div key={p.name} className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
                <button className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between"><dt className="text-slate-400">Monthly</dt><dd className="font-semibold text-slate-700">{p.monthly}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Annual</dt><dd className="font-semibold text-slate-700">{p.annual}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Subscribers</dt><dd className="font-bold text-indigo-600 tabular-nums">{p.subscribers}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 self-center mr-auto px-1">All Transactions</h2>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-400 capitalize">
            {["all", "paid", "pending", "failed", "refunded"].map(s => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
          </select>
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {["Transaction ID", "Member", "Plan", "Amount", "Method", "Status", "Date", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTx.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{t.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs font-semibold text-slate-800">{t.user}</p>
                    <p className="text-[11px] text-slate-400">{t.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{t.plan}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800 tabular-nums whitespace-nowrap">{t.amount}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{t.method}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button title="View receipt" className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Receipt className="h-3.5 w-3.5" /></button>
                      <button title="Email receipt" className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Mail className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTx.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <CreditCard className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">No transactions found</p>
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
