"use client"

import { useState, useTransition } from "react"
import {
  CalendarCheck, Plus, MagnifyingGlass, DotsThreeVertical, Star, Eye, PencilSimple,
  Trash, Users, MapPin, VideoCamera, CheckCircle, XCircle, Clock,
  TrendUp, CurrencyInr, Megaphone, Copy,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, ProgressBar, Table, Thead, Tbody, Tr, Th, Td, Button } from "../admin-ui"
import CreateEventModal from "./create-event-modal"
import { inviteAllToEventAction } from "./actions"

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
  const [createOpen, setCreateOpen] = useState(false)
  const [inviting, startInvite] = useTransition()
  const [inviteMsg, setInviteMsg] = useState<Record<string, string>>({})

  function inviteAll(id: string) {
    setActiveMenu(null)
    startInvite(async () => {
      const r = await inviteAllToEventAction(id)
      setInviteMsg(m => ({ ...m, [id]: r.ok ? "Invites scheduled — going out in priority waves" : (r.error ?? "Failed") }))
    })
  }

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
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" weight="duotone" /> Create Event
          </Button>
        }
      />

      <CreateEventModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Upcoming Events" value="6" icon={<CalendarCheck className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="Total Registrations" value="719" delta="+22%" deltaUp icon={<Users className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Event Revenue (YTD)" value="Rs 1.6L" delta="+34%" deltaUp icon={<CurrencyInr className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Pending Approval" value={String(pendingCount)} icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
      </div>

      {/* Toolbar */}
      <div className="rounded-lg border border-zinc-800 bg-[#111113] overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-zinc-800">
          <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 overflow-x-auto">
            {(["all", "upcoming", "pending", "draft", "past"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize whitespace-nowrap transition-colors ${tab === t ? "bg-[#111113] text-blue-400 shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}>
                {t}
                {t === "pending" && pendingCount > 0 && <span className="ml-1 rounded-full bg-amber-400 text-amber-950 px-1.5 text-[10px] font-bold">{pendingCount}</span>}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" weight="duotone" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..."
              className="w-full rounded-lg border border-zinc-800 bg-[#111113] pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-950 transition-all" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr className="hover:bg-transparent">
                {["Event", "Date", "Organizer", "Registrations", "Revenue", "Status", ""].map((h, i) => (
                  <Th key={i} className="whitespace-nowrap">{h}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map(e => {
                const status = approvals[e.id] === "upcoming" ? "upcoming" : e.status
                return (
                  <Tr key={e.id}>
                    <Td>
                      <div className="flex items-center gap-2.5 min-w-[220px]">
                        <button
                          onClick={() => setFeaturedState(s => ({ ...s, [e.id]: !s[e.id] }))}
                          title={featuredState[e.id] ? "Unfeature" : "Feature on homepage"}
                          className="flex-shrink-0"
                        >
                          <Star className={`h-4 w-4 transition-colors ${featuredState[e.id] ? "text-amber-400" : "text-zinc-700 hover:text-amber-300"}`} weight={featuredState[e.id] ? "fill" : "duotone"} />
                        </button>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-200 truncate">{e.title}</p>
                          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                            <span className="capitalize">{e.category}</span>
                            <span className="text-zinc-700">·</span>
                            <span className="flex items-center gap-0.5 capitalize">
                              {e.mode === "virtual" ? <VideoCamera className="h-3 w-3" weight="duotone" /> : <MapPin className="h-3 w-3" weight="duotone" />}
                              {e.mode}
                            </span>
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-xs text-zinc-400 whitespace-nowrap">{e.date}</Td>
                    <Td className="text-xs text-zinc-400 whitespace-nowrap">{e.organizer}</Td>
                    <Td className="min-w-[140px]">
                      <p className="text-xs font-semibold text-zinc-300 mb-1 tabular-nums">{e.registered} / {e.capacity}</p>
                      <ProgressBar value={e.registered} max={e.capacity} color={e.registered / e.capacity > 0.8 ? "#f43f5e" : "#3b82f6"} />
                    </Td>
                    <Td className="text-xs font-bold text-zinc-300 tabular-nums whitespace-nowrap">{e.revenue}</Td>
                    <Td><StatusBadge status={status} /></Td>
                    <Td className="relative">
                      {status === "pending" ? (
                        <div className="flex gap-1.5">
                          <button onClick={() => setApprovals(a => ({ ...a, [e.id]: "upcoming" }))}
                            className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 whitespace-nowrap">
                            <CheckCircle className="h-3 w-3" weight="duotone" /> Approve
                          </button>
                          <button onClick={() => setApprovals(a => ({ ...a, [e.id]: "rejected" }))}
                            className="flex items-center gap-1 rounded-md border border-rose-800 px-2.5 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-950/40 whitespace-nowrap">
                            <XCircle className="h-3 w-3" weight="duotone" /> Reject
                          </button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setActiveMenu(activeMenu === e.id ? null : e.id)}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800">
                            <DotsThreeVertical className="h-4 w-4" weight="duotone" />
                          </button>
                          {activeMenu === e.id && (
                            <div className="absolute right-4 top-10 z-20 w-52 rounded-lg border border-zinc-800 bg-[#111113] py-1 shadow-xl">
                              <button
                                onClick={() => inviteAll(e.id)}
                                disabled={inviting}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-zinc-800 disabled:opacity-50"
                              >
                                <Megaphone className="h-4 w-4" weight="duotone" /> Invite all members
                              </button>
                              <div className="my-1 border-t border-zinc-800" />
                              {[
                                { icon: <Eye className="h-4 w-4" weight="duotone" />, label: "View event page" },
                                { icon: <PencilSimple className="h-4 w-4" weight="duotone" />, label: "Edit details" },
                                { icon: <Users className="h-4 w-4" weight="duotone" />, label: "View attendees" },
                                { icon: <Copy className="h-4 w-4" weight="duotone" />, label: "Duplicate event" },
                              ].map((item, i) => (
                                <button key={i} onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                                  {item.icon}{item.label}
                                </button>
                              ))}
                              <div className="my-1 border-t border-zinc-800" />
                              <button onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40">
                                <Trash className="h-4 w-4" weight="duotone" /> Cancel event
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      {inviteMsg[e.id] && (
                        <p className="mt-1 text-[11px] text-zinc-400 whitespace-nowrap">{inviteMsg[e.id]}</p>
                      )}
                    </Td>
                  </Tr>
                )
              })}
              {filtered.length === 0 && (
                <Tr>
                  <Td colSpan={7} className="text-center py-12">
                    <CalendarCheck className="h-8 w-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
                    <p className="text-sm font-medium text-zinc-400">No events found</p>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>
      </div>
    </div>
  )
}
