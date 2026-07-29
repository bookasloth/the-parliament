"use client"

import { useState } from "react"
import {
  Users, ShieldCheck, Flag, CreditCard, CalendarDays, FileText,
  ArrowRight, UserPlus, AlertTriangle, CheckCircle2, Clock,
  Activity, Server, Database, Mail, ChevronRight, Sparkles,
} from "lucide-react"
import { PageHeader, StatCard, StatusBadge, LineChart, BarChart } from "./admin-ui"

const userGrowth = [1840, 1905, 1980, 2076, 2150, 2243, 2310, 2402, 2515, 2603, 2718, 2847]
const engagement = [420, 380, 510, 465, 590, 620, 543]
const engagementLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const pendingActions = [
  { icon: <ShieldCheck className="h-4 w-4 text-amber-500" />, label: "12 verification requests awaiting review", href: "/admin/verification", urgency: "high" },
  { icon: <Flag className="h-4 w-4 text-rose-500" />, label: "7 content reports open", href: "/admin/moderation", urgency: "high" },
  { icon: <CalendarDays className="h-4 w-4 text-sky-500" />, label: "2 event proposals pending approval", href: "/admin/events", urgency: "medium" },
  { icon: <CreditCard className="h-4 w-4 text-emerald-500" />, label: "3 refund requests to process", href: "/admin/membership", urgency: "medium" },
]

export interface RecentSignup {
  name: string
  email: string
  batch: string
  time: string
  status: string
}

export const MOCK_RECENT_SIGNUPS: RecentSignup[] = [
  { name: "Ananya Deshmukh", email: "ananya.d@gmail.com", batch: "2016", time: "12 min ago", status: "pending" },
  { name: "Rohan Kulkarni", email: "rohan.k@outlook.com", batch: "2011", time: "1 hr ago", status: "pending" },
  { name: "Sneha Joshi", email: "sneha.joshi@gmail.com", batch: "2009", time: "3 hrs ago", status: "verified" },
  { name: "Karan Patil", email: "karan.p@yahoo.com", batch: "2018", time: "5 hrs ago", status: "pending" },
  { name: "Meera Iyer", email: "meera.iyer@gmail.com", batch: "2007", time: "8 hrs ago", status: "verified" },
]

const recentTransactions = [
  { id: "PAY-7841", user: "Dr. Amit Verma", plan: "Life Member", amount: "Rs 9,999", status: "paid", time: "Today, 10:42 AM" },
  { id: "PAY-7840", user: "Priya Sharma", plan: "Associate (Annual)", amount: "Rs 799", status: "paid", time: "Today, 9:15 AM" },
  { id: "PAY-7839", user: "Vikram Singh", plan: "Premium (Annual)", amount: "Rs 2,499", status: "paid", time: "Yesterday" },
  { id: "PAY-7838", user: "Rahul Mehta", plan: "Premium (Monthly)", amount: "Rs 299", status: "failed", time: "Yesterday" },
  { id: "PAY-7837", user: "Sunita Patel", plan: "Associate (Annual)", amount: "Rs 799", status: "refunded", time: "2 days ago" },
]

const activityFeed = [
  { actor: "Moderator Kiran", action: "removed a reported post in", target: "Batch 2010 Memories", time: "25 min ago" },
  { actor: "System", action: "auto-flagged a comment for review in", target: "Career Advice", time: "1 hr ago" },
  { actor: "Admin Shubham", action: "approved verification for", target: "Sneha Joshi", time: "3 hrs ago" },
  { actor: "Moderator Kiran", action: "featured the event", target: "Grand Alumni Reunion 2025", time: "5 hrs ago" },
  { actor: "System", action: "processed payout reconciliation for", target: "Razorpay settlements", time: "Yesterday" },
]

const systemHealth = [
  { icon: <Server className="h-4 w-4" />, label: "API Server", status: "Operational", ok: true },
  { icon: <Database className="h-4 w-4" />, label: "PostgreSQL", status: "Operational", ok: true },
  { icon: <Mail className="h-4 w-4" />, label: "SMTP (Hostinger)", status: "Operational", ok: true },
  { icon: <CreditCard className="h-4 w-4" />, label: "Razorpay Webhooks", status: "Degraded — retrying", ok: false },
]

export default function AdminDashboardClient({
  totalUsers,
  newThisWeek,
  pendingApprovals,
  recentSignups = MOCK_RECENT_SIGNUPS,
}: {
  totalUsers?: number
  newThisWeek?: number
  pendingApprovals?: number
  recentSignups?: RecentSignup[]
}) {
  const [range, setRange] = useState<"7d" | "30d" | "12m">("12m")

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Platform overview for JNV Nagpur Alumni Network"
        actions={
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {(["7d", "30d", "12m"] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${range === r ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                {r}
              </button>
            ))}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <StatCard label="Total Users" value={(totalUsers ?? 2847).toLocaleString()} delta="+4.7%" deltaUp icon={<Users className="h-4.5 w-4.5" />} accent="indigo" />
        <StatCard label="New This Week" value={(newThisWeek ?? 0).toLocaleString()} delta="+12.3%" deltaUp icon={<Activity className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="Pending Verifications" value={(pendingApprovals ?? 12).toLocaleString()} delta="+5" deltaUp={false} icon={<ShieldCheck className="h-4.5 w-4.5" />} accent="amber" />
        <StatCard label="Open Reports" value="7" delta="-3" deltaUp icon={<Flag className="h-4.5 w-4.5" />} accent="rose" />
        <StatCard label="Revenue (MTD)" value="Rs 48.2k" delta="+18.9%" deltaUp icon={<CreditCard className="h-4.5 w-4.5" />} accent="violet" />
        <StatCard label="Upcoming Events" value="6" icon={<CalendarDays className="h-4.5 w-4.5" />} accent="sky" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        {/* User growth chart */}
        <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-slate-900">User Growth</h2>
            <span className="text-xs text-slate-400">Last 12 months</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            <span className="font-bold text-emerald-600">+1,007 members</span> since last year
          </p>
          <LineChart data={userGrowth} height={140} />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>Jul</span><span>Sep</span><span>Nov</span><span>Jan</span><span>Mar</span><span>Jun</span>
          </div>
        </div>

        {/* Pending actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Needs Attention</h2>
          <ul className="space-y-2">
            {pendingActions.map((a, i) => (
              <li key={i}>
                <a href={a.href} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors group">
                  <span className="flex-shrink-0">{a.icon}</span>
                  <span className="flex-1 text-xs font-medium text-slate-700">{a.label}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 flex-shrink-0" />
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">System health</p>
            <ul className="space-y-1.5">
              {systemHealth.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">{s.icon}</span>
                  <span className="flex-1 text-slate-600">{s.label}</span>
                  <span className={`flex items-center gap-1 font-semibold ${s.ok ? "text-emerald-600" : "text-amber-600"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.ok ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        {/* Engagement bar chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Posts This Week</h2>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Sparkles className="h-3.5 w-3.5" /> 3,528 total</span>
          </div>
          <BarChart data={engagement} labels={engagementLabels} />
        </div>

        {/* Recent signups */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><UserPlus className="h-4 w-4 text-indigo-500" /> Recent Signups</h2>
            <a href="/admin/users" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-0.5">View all <ArrowRight className="h-3 w-3" /></a>
          </div>
          <ul className="divide-y divide-slate-50">
            {recentSignups.map((u, i) => (
              <li key={i} className="flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-slate-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600 flex-shrink-0">
                  {u.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{u.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">Batch {u.batch} · {u.time}</p>
                </div>
                <StatusBadge status={u.status} />
              </li>
            ))}
          </ul>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Clock className="h-4 w-4 text-violet-500" /> Admin Activity</h2>
          </div>
          <ul className="divide-y divide-slate-50">
            {activityFeed.map((a, i) => (
              <li key={i} className="px-4 sm:px-5 py-2.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">{a.actor}</span> {a.action}{" "}
                  <span className="font-semibold text-indigo-600">{a.target}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{a.time}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-500" /> Recent Transactions</h2>
          <a href="/admin/membership" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-0.5">View all <ArrowRight className="h-3 w-3" /></a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {["Transaction", "Member", "Plan", "Amount", "Status", "Date"].map(h => (
                  <th key={h} className="px-4 sm:px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentTransactions.map((t, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 sm:px-5 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{t.id}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs font-semibold text-slate-800 whitespace-nowrap">{t.user}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-slate-600 whitespace-nowrap">{t.plan}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs font-bold text-slate-800 tabular-nums whitespace-nowrap">{t.amount}</td>
                  <td className="px-4 sm:px-5 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{t.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
