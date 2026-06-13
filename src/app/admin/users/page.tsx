"use client"

import { useState } from "react"
import {
  Search, Filter, Download, UserPlus, MoreHorizontal, Eye,
  ShieldCheck, Ban, Trash2, Mail, ChevronLeft, ChevronRight,
  Users, UserCheck, UserX, Clock, X, KeyRound, Crown,
} from "lucide-react"
import { PageHeader, StatCard, StatusBadge } from "../admin-ui"

interface AdminUser {
  id: string
  name: string
  email: string
  username: string
  batch: string
  house: string
  houseColor: string
  membership: "free" | "associate" | "premium" | "life"
  status: "active" | "pending" | "suspended"
  karma: number
  joined: string
  lastActive: string
}

const allUsers: AdminUser[] = [
  { id: "u1", name: "Neha Gupta", email: "neha.gupta@gmail.com", username: "neha-gupta", batch: "2008", house: "Udaigiri", houseColor: "#ffe135", membership: "premium", status: "active", karma: 1240, joined: "Jan 2025", lastActive: "2 min ago" },
  { id: "u2", name: "Dr. Amit Verma", email: "amit.verma@gmail.com", username: "amit-verma", batch: "2005", house: "Aravali", houseColor: "#5a9bd5", membership: "life", status: "active", karma: 2890, joined: "Dec 2024", lastActive: "1 hr ago" },
  { id: "u3", name: "Priya Sharma", email: "priya.s@outlook.com", username: "priya-sharma", batch: "2010", house: "Nilgiri", houseColor: "#70ad47", membership: "associate", status: "active", karma: 876, joined: "Feb 2025", lastActive: "Today" },
  { id: "u4", name: "Vikram Singh", email: "vikram.singh@gmail.com", username: "vikram-singh", batch: "2007", house: "Shiwalik", houseColor: "#e8503a", membership: "premium", status: "active", karma: 1530, joined: "Jan 2025", lastActive: "Yesterday" },
  { id: "u5", name: "Ananya Deshmukh", email: "ananya.d@gmail.com", username: "ananya-deshmukh", batch: "2016", house: "Indira", houseColor: "#ff9933", membership: "free", status: "pending", karma: 12, joined: "Today", lastActive: "12 min ago" },
  { id: "u6", name: "Rohan Kulkarni", email: "rohan.k@outlook.com", username: "rohan-kulkarni", batch: "2011", house: "Laxmi", houseColor: "#e75480", membership: "free", status: "pending", karma: 0, joined: "Today", lastActive: "1 hr ago" },
  { id: "u7", name: "Rahul Mehta", email: "rahul.mehta@gmail.com", username: "rahul-mehta", batch: "2012", house: "Aravali", houseColor: "#5a9bd5", membership: "free", status: "active", karma: 445, joined: "Mar 2025", lastActive: "3 days ago" },
  { id: "u8", name: "Sunita Patel", email: "sunita.p@gmail.com", username: "sunita-patel", batch: "2009", house: "Nilgiri", houseColor: "#70ad47", membership: "associate", status: "active", karma: 990, joined: "Feb 2025", lastActive: "Today" },
  { id: "u9", name: "Deepak Wankhede", email: "deepak.w@gmail.com", username: "deepak-wankhede", batch: "2014", house: "Shiwalik", houseColor: "#e8503a", membership: "free", status: "suspended", karma: -45, joined: "Jan 2025", lastActive: "2 weeks ago" },
  { id: "u10", name: "Kavya Reddy", email: "kavya.r@gmail.com", username: "kavya-reddy", batch: "2013", house: "Udaigiri", houseColor: "#ffe135", membership: "free", status: "active", karma: 230, joined: "Apr 2025", lastActive: "5 hrs ago" },
]

const HOUSES = ["All Houses", "Aravali", "Nilgiri", "Shiwalik", "Udaigiri", "Indira", "Laxmi"]
const STATUSES = ["All Statuses", "active", "pending", "suspended"]
const MEMBERSHIPS = ["All Plans", "free", "associate", "premium", "life"]

export default function AdminUsersPage() {
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [houseFilter, setHouseFilter] = useState("All Houses")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [planFilter, setPlanFilter] = useState("All Plans")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const filtered = allUsers.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (houseFilter !== "All Houses" && u.house !== houseFilter) return false
    if (statusFilter !== "All Statuses" && u.status !== statusFilter) return false
    if (planFilter !== "All Plans" && u.membership !== planFilter) return false
    return true
  })

  const allSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map(u => u.id)))
  }

  function toggleOne(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage all members of the alumni network"
        actions={
          <>
            <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
              <UserPlus className="h-3.5 w-3.5" /> Invite User
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Users" value="2,847" icon={<Users className="h-4.5 w-4.5" />} accent="indigo" />
        <StatCard label="Verified" value="2,103" icon={<UserCheck className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="Pending Approval" value="38" icon={<Clock className="h-4.5 w-4.5" />} accent="amber" />
        <StatCard label="Suspended" value="14" icon={<UserX className="h-4.5 w-4.5" />} accent="rose" />
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${showFilters ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <Filter className="h-3.5 w-3.5" /> Filters
            {(houseFilter !== "All Houses" || statusFilter !== "All Statuses" || planFilter !== "All Plans") && (
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 border-b border-slate-100 bg-slate-50/50">
            {[
              { label: "House", value: houseFilter, set: setHouseFilter, options: HOUSES },
              { label: "Status", value: statusFilter, set: setStatusFilter, options: STATUSES },
              { label: "Membership", value: planFilter, set: setPlanFilter, options: MEMBERSHIPS },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{f.label}</label>
                <select
                  value={f.value}
                  onChange={e => { f.set(e.target.value); setPage(1) }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-indigo-400 capitalize"
                >
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
            <span className="text-xs font-semibold text-indigo-700">{selected.size} selected</span>
            <div className="flex gap-1.5 ml-2">
              <button className="flex items-center gap-1 rounded-md bg-white border border-indigo-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100">
                <ShieldCheck className="h-3 w-3" /> Verify
              </button>
              <button className="flex items-center gap-1 rounded-md bg-white border border-indigo-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100">
                <Mail className="h-3 w-3" /> Email
              </button>
              <button className="flex items-center gap-1 rounded-md bg-white border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                <Ban className="h-3 w-3" /> Suspend
              </button>
            </div>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2.5 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 accent-indigo-600" />
                </th>
                {["Member", "Batch / House", "Membership", "Karma", "Status", "Last Active", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 ${selected.has(u.id) ? "bg-indigo-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} className="h-3.5 w-3.5 accent-indigo-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-[180px]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white flex-shrink-0" style={{ backgroundColor: u.houseColor === "#ffe135" ? "#d4a017" : u.houseColor }}>
                        {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1">
                          {u.name}
                          {u.membership === "life" && <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs text-slate-700">Batch {u.batch}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: u.houseColor }} />
                      {u.house}
                    </p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={u.membership} /></td>
                  <td className="px-4 py-3 text-xs font-bold tabular-nums whitespace-nowrap">
                    <span className={u.karma < 0 ? "text-rose-500" : "text-slate-700"}>{u.karma.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{u.lastActive}</td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === u.id ? null : u.id)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {activeMenu === u.id && (
                      <div className="absolute right-4 top-10 z-20 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        {[
                          { icon: <Eye className="h-4 w-4" />, label: "View profile" },
                          { icon: <ShieldCheck className="h-4 w-4" />, label: "Verify account" },
                          { icon: <KeyRound className="h-4 w-4" />, label: "Reset password" },
                          { icon: <Mail className="h-4 w-4" />, label: "Send email" },
                        ].map((item, i) => (
                          <button key={i} onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                            {item.icon}{item.label}
                          </button>
                        ))}
                        <div className="my-1 border-t border-slate-100" />
                        <button onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-amber-600 hover:bg-amber-50">
                          <Ban className="h-4 w-4" /> {u.status === "suspended" ? "Unsuspend" : "Suspend"}
                        </button>
                        <button onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-rose-500 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" /> Delete account
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Users className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">No users match your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of <span className="font-semibold text-slate-600">2,847</span> users</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} className="p-1.5 rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40" disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            {[1, 2, 3].map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`h-7 w-7 rounded-md text-xs font-semibold ${page === p ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                {p}
              </button>
            ))}
            <span className="text-xs text-slate-400 px-1">... 285</span>
            <button onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
