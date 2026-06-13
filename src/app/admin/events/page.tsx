"use client"

import { useState } from "react"
import {
  CalendarDays, Plus, Search, MoreHorizontal, Star, Eye, Pencil,
  Trash2, Users, MapPin, Video, CheckCircle2, XCircle, Clock,
  TrendingUp, IndianRupee, Megaphone, Copy,
} from "lucide-react"
import { PageHeader, StatCard, StatusBadge, ProgressBar } from "../admin-ui"

interface AdminEvent {
  id: string
  title: string
  category: string
  mode: "in-person" | "virtual" | "hybrid"
  date: string
  organizer: string
  registered: number
  capacity: number
  revenue: string
  status: "upcoming" | "draft" | "past" | "pending"
  featured: boolean
}

const events: AdminEvent[] = [
  { id: "e1", title: "JNV Nagpur Grand Alumni Reunion 2025", category: "Reunion", mode: "in-person", date: "Oct 18-19, 2025", organizer: "NNAWCA", registered: 287, capacity: 500, revenue: "Rs 1,43,500", status: "upcoming", featured: true },
  { id: "e2", title: "Career Mentorship Webinar: Cracking UPSC", category: "Webinar", mode: "virtual", date: "Jul 12, 2025", organizer: "Neha Gupta", registered: 156, capacity: 300, revenue: "Free", status: "upcoming", featured: false },
  { id: "e3", title: "Nagpur Chapter Monthly Meetup", category: "Meetup", mode: "in-person", date: "Jul 5, 2025", organizer: "Vikram Singh", registered: 42, capacity: 60, revenue: "Rs 4,200", status: "upcoming", featured: false },
  { id: "e4", title: "Inter-Batch Cricket Tournament", category: "Sports", mode: "in-person", date: "Aug 2, 2025", organizer: "Rahul Mehta", registered: 88, capacity: 120, revenue: "Rs 8,800", status: "upcoming", featured: true },
  { id: "e5", title: "Alumni Startup Pitch Night", category: "Business", mode: "hybrid", date: "TBD", organizer: "Priya Sharma", registered: 0, capacity: 100, revenue: "—", status: "pending", featured: false },
  { id: "e6", title: "Health Camp at JNV Campus", category: "Social Service", mode: "in-person", date: "TBD", organizer: "Dr. Amit Verma", registered: 0, capacity: 200, revenue: "—", status: "pending", featured: false },
  { id: "e7", title: "Women Alumni Leadership Summit", category: "Conference", mode: "hybrid", date: "Sep 14, 2025", organizer: "NNAWCA", registered: 12, capacity: 150, revenue: "Rs 3,600", status: "draft", featured: false },
  { id: "e8", title: "Annual General Meeting 2025", category: "Official", mode: "in-person", date: "Mar 22, 2025", organizer: "NNAWCA", registered: 134, capacity: 150, revenue: "Free", status: "past", featured: false },
]

type Tab = "all" | "upcoming" | "pending" | "draft" | "past"

export default function AdminEventsPage() {
  const [tab, setTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [featuredState, setFeaturedState] = useState<Record<string, boolean>>(
    Object.fromEntries(events.map(e => [e.id, e.featured]))
  )
  const [approvals, setApprovals] = useState<Record<string, "upcoming" | "rejected">>({})

  const filtered = events.filter(e => {
    const status = approvals[e.id] === "upcoming" ? "upcoming" : e.status
    if (approvals[e.id] === "rejected") return false
    if (tab !== "all" && status !== tab) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pendingCount = events.filter(e => e.status === "pending" && !approvals[e.id]).length

  return (
    <div>
      <PageHeader
        title="Events"
        description="Approve, feature, and manage all platform events"
        actions={
          <button className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
            <Plus className="h-3.5 w-3.5" /> Create Event
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Upcoming Events" value="6" icon={<CalendarDays className="h-4.5 w-4.5" />} accent="sky" />
        <StatCard label="Total Registrations" value="719" delta="+22%" deltaUp icon={<Users className="h-4.5 w-4.5" />} accent="indigo" />
        <StatCard label="Event Revenue (YTD)" value="Rs 1.6L" delta="+34%" deltaUp icon={<IndianRupee className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="Pending Approval" value={String(pendingCount)} icon={<Clock className="h-4.5 w-4.5" />} accent="amber" />
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-slate-100">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 overflow-x-auto">
            {(["all", "upcoming", "pending", "draft", "past"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize whitespace-nowrap transition-colors ${tab === t ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {t}
                {t === "pending" && pendingCount > 0 && <span className="ml-1 rounded-full bg-amber-400 text-amber-900 px-1.5 text-[10px] font-bold">{pendingCount}</span>}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                {["Event", "Date", "Organizer", "Registrations", "Revenue", "Status", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(e => {
                const status = approvals[e.id] === "upcoming" ? "upcoming" : e.status
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-[220px]">
                        <button
                          onClick={() => setFeaturedState(s => ({ ...s, [e.id]: !s[e.id] }))}
                          title={featuredState[e.id] ? "Unfeature" : "Feature on homepage"}
                          className="flex-shrink-0"
                        >
                          <Star className={`h-4 w-4 transition-colors ${featuredState[e.id] ? "text-amber-400 fill-amber-400" : "text-slate-200 hover:text-amber-300"}`} />
                        </button>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{e.title}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="capitalize">{e.category}</span>
                            <span className="text-slate-300">·</span>
                            <span className="flex items-center gap-0.5 capitalize">
                              {e.mode === "virtual" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                              {e.mode}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{e.date}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{e.organizer}</td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <p className="text-xs font-semibold text-slate-700 mb-1 tabular-nums">{e.registered} / {e.capacity}</p>
                      <ProgressBar value={e.registered} max={e.capacity} color={e.registered / e.capacity > 0.8 ? "#f43f5e" : "#6366f1"} />
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-700 tabular-nums whitespace-nowrap">{e.revenue}</td>
                    <td className="px-4 py-3"><StatusBadge status={status} /></td>
                    <td className="px-4 py-3 relative">
                      {status === "pending" ? (
                        <div className="flex gap-1.5">
                          <button onClick={() => setApprovals(a => ({ ...a, [e.id]: "upcoming" }))}
                            className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 whitespace-nowrap">
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </button>
                          <button onClick={() => setApprovals(a => ({ ...a, [e.id]: "rejected" }))}
                            className="flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 whitespace-nowrap">
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setActiveMenu(activeMenu === e.id ? null : e.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {activeMenu === e.id && (
                            <div className="absolute right-4 top-10 z-20 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                              {[
                                { icon: <Eye className="h-4 w-4" />, label: "View event page" },
                                { icon: <Pencil className="h-4 w-4" />, label: "Edit details" },
                                { icon: <Users className="h-4 w-4" />, label: "View attendees" },
                                { icon: <Megaphone className="h-4 w-4" />, label: "Send announcement" },
                                { icon: <Copy className="h-4 w-4" />, label: "Duplicate event" },
                              ].map((item, i) => (
                                <button key={i} onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                                  {item.icon}{item.label}
                                </button>
                              ))}
                              <div className="my-1 border-t border-slate-100" />
                              <button onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-rose-500 hover:bg-rose-50">
                                <Trash2 className="h-4 w-4" /> Cancel event
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <CalendarDays className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">No events found</p>
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
