"use client"

import {
  Users, ShieldCheck, Flag, CreditCard, CalendarCheck,
  ArrowRight, UserPlus, Clock, Pulse, CaretRight, Sparkle,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, LineChart, BarChart, Table, Thead, Tbody, Tr, Th, Td } from "./admin-ui"

export interface RecentSignup {
  name: string
  email: string
  batch: string
  time: string
  status: string
}

export interface NeedsAttentionRow {
  kind: "verification" | "reports" | "events"
  label: string
  href: string
}

export interface AdminActivityRow {
  actor: string
  action: string
  entityType: string
  time: string
}

export interface TransactionRow {
  id: string
  user: string
  plan: string
  amount: string
  status: string
  time: string
}

const attentionIcon = {
  verification: <ShieldCheck className="h-4 w-4 text-amber-400" weight="duotone" />,
  reports: <Flag className="h-4 w-4 text-rose-400" weight="duotone" />,
  events: <CalendarCheck className="h-4 w-4 text-sky-400" weight="duotone" />,
}

export default function AdminDashboardClient({
  totalUsers,
  newThisWeek,
  newWeekDelta,
  newWeekDeltaUp,
  pendingVerifications,
  openReports,
  revenueMtd,
  revenueDelta,
  revenueDeltaUp,
  upcomingEvents,
  dau,
  mau,
  userGrowth,
  userGrowthLabels,
  membersSinceLastYear,
  postsWeek,
  postsWeekLabels,
  postsWeekTotal,
  needsAttention,
  recentSignups,
  adminActivity,
  transactions,
}: {
  totalUsers: number
  newThisWeek: number
  newWeekDelta?: string
  newWeekDeltaUp?: boolean
  pendingVerifications: number
  openReports: number
  revenueMtd: string
  revenueDelta?: string
  revenueDeltaUp?: boolean
  upcomingEvents: number
  dau: number
  mau: number
  userGrowth: number[]
  userGrowthLabels: string[]
  membersSinceLastYear: number
  postsWeek: number[]
  postsWeekLabels: string[]
  postsWeekTotal: number
  needsAttention: NeedsAttentionRow[]
  recentSignups: RecentSignup[]
  adminActivity: AdminActivityRow[]
  transactions: TransactionRow[]
}) {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Platform overview for JNV Nagpur Alumni Network"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <StatCard label="Total Users" value={totalUsers.toLocaleString()} icon={<Users className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="New This Week" value={newThisWeek.toLocaleString()} delta={newWeekDelta} deltaUp={newWeekDeltaUp} icon={<Pulse className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Pending Verifications" value={pendingVerifications.toLocaleString()} icon={<ShieldCheck className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Open Reports" value={openReports.toLocaleString()} icon={<Flag className="h-4.5 w-4.5" weight="duotone" />} accent="rose" />
        <StatCard label="Revenue (MTD)" value={revenueMtd} delta={revenueDelta} deltaUp={revenueDeltaUp} icon={<CreditCard className="h-4.5 w-4.5" weight="duotone" />} accent="violet" />
        <StatCard label="Upcoming Events" value={upcomingEvents.toLocaleString()} icon={<CalendarCheck className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        {/* User growth chart */}
        <div className="xl:col-span-2 rounded-[4px] border border-zinc-800 bg-[#111113] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-zinc-100">User Growth</h2>
            <span className="text-xs text-zinc-500">Monthly signups · last 12 months</span>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            <span className="font-bold text-emerald-400">+{membersSinceLastYear.toLocaleString()} members</span> since last year
          </p>
          <LineChart data={userGrowth} height={140} />
          <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
            {userGrowthLabels.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        </div>

        {/* Needs attention + live metrics */}
        <div className="rounded-[4px] border border-zinc-800 bg-[#111113] p-4 sm:p-5">
          <h2 className="text-sm font-bold text-zinc-100 mb-3">Needs Attention</h2>
          {needsAttention.length > 0 ? (
            <ul className="space-y-2">
              {needsAttention.map((a, i) => (
                <li key={i}>
                  <a href={a.href} className="flex items-center gap-3 rounded-[4px] border border-zinc-800 p-3 hover:border-blue-800 hover:bg-blue-950/20 transition-colors group">
                    <span className="flex-shrink-0">{attentionIcon[a.kind]}</span>
                    <span className="flex-1 text-xs font-medium text-zinc-300">{a.label}</span>
                    <CaretRight className="h-4 w-4 text-zinc-600 group-hover:text-blue-400 flex-shrink-0" weight="duotone" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[4px] border border-zinc-800 p-3 text-xs text-zinc-500">All clear — nothing needs review.</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[4px] bg-zinc-900 border border-zinc-800 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Active today</p>
              <p className="mt-1 text-lg font-bold text-zinc-100 tabular-nums">{dau.toLocaleString()}</p>
            </div>
            <div className="rounded-[4px] bg-zinc-900 border border-zinc-800 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Active (30d)</p>
              <p className="mt-1 text-lg font-bold text-zinc-100 tabular-nums">{mau.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        {/* Posts this week */}
        <div className="rounded-[4px] border border-zinc-800 bg-[#111113] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-100">Posts This Week</h2>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400"><Sparkle className="h-3.5 w-3.5" weight="duotone" /> {postsWeekTotal.toLocaleString()} total</span>
          </div>
          <BarChart data={postsWeek} labels={postsWeekLabels} />
        </div>

        {/* Recent signups */}
        <div className="rounded-[4px] border border-zinc-800 bg-[#111113] overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2"><UserPlus className="h-4 w-4 text-blue-400" weight="duotone" /> Recent Signups</h2>
            <a href="/admin/users" className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-0.5">View all <ArrowRight className="h-3 w-3" weight="duotone" /></a>
          </div>
          {recentSignups.length > 0 ? (
            <ul className="divide-y divide-zinc-800">
              {recentSignups.map((u, i) => (
                <li key={i} className="flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-zinc-900/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-blue-950/50 text-[11px] font-bold text-blue-300 flex-shrink-0">
                    {u.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">{u.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">Batch {u.batch} · {u.time}</p>
                  </div>
                  <StatusBadge status={u.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 sm:px-5 py-6 text-xs text-zinc-500">No signups yet.</p>
          )}
        </div>

        {/* Admin activity */}
        <div className="rounded-[4px] border border-zinc-800 bg-[#111113] overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2"><Clock className="h-4 w-4 text-violet-400" weight="duotone" /> Admin Activity</h2>
          </div>
          {adminActivity.length > 0 ? (
            <ul className="divide-y divide-zinc-800">
              {adminActivity.map((a, i) => (
                <li key={i} className="px-4 sm:px-5 py-2.5">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <span className="font-semibold text-zinc-200">{a.actor}</span> {a.action}
                    {a.entityType && <> <span className="font-semibold text-blue-400">{a.entityType}</span></>}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{a.time}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 sm:px-5 py-6 text-xs text-zinc-500">No admin activity logged.</p>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-[4px] border border-zinc-800 bg-[#111113] overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-400" weight="duotone" /> Recent Transactions</h2>
          <a href="/admin/membership" className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-0.5">View all <ArrowRight className="h-3 w-3" weight="duotone" /></a>
        </div>
        {transactions.length > 0 ? (
          <div className="overflow-x-auto px-4 sm:px-5">
            <Table>
              <Thead>
                <Tr className="hover:bg-transparent">
                  <Th>Transaction</Th>
                  <Th>Member</Th>
                  <Th>Plan</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {transactions.map((t, i) => (
                  <Tr key={i}>
                    <Td className="font-mono text-zinc-500 whitespace-nowrap">{t.id}</Td>
                    <Td className="font-semibold text-zinc-200 whitespace-nowrap">{t.user}</Td>
                    <Td className="whitespace-nowrap">{t.plan}</Td>
                    <Td className="font-bold text-zinc-200 tabular-nums whitespace-nowrap">{t.amount}</Td>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td className="text-zinc-500 whitespace-nowrap">{t.time}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        ) : (
          <p className="px-4 sm:px-5 py-6 text-xs text-zinc-500">No transactions yet.</p>
        )}
      </div>
    </div>
  )
}
