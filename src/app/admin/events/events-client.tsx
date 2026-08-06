"use client"

import { useState, useTransition } from "react"
import {
  CalendarCheck, Plus, MagnifyingGlass, DotsThreeVertical, Star, Eye, PencilSimple,
  Trash, Users, MapPin, VideoCamera, Clock, CurrencyInr, Megaphone, Copy,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, Table, Thead, Tbody, Tr, Th, Td, Button } from "../admin-ui"
import type { AdminEventRow } from "@/modules/events/service"
import CreateEventModal from "./create-event-modal"
import { inviteAllToEventAction, toggleEventFeaturedAction, cancelEventAction } from "./actions"

type Tab = "all" | "upcoming" | "draft" | "past" | "cancelled"

function formatRevenue(row: AdminEventRow): string {
  if (row.revenuePaise > 0) return `Rs ${(row.revenuePaise / 100).toLocaleString("en-IN")}`
  return row.isFree ? "Free" : "—"
}

export default function EventsClient({ events }: { events: AdminEventRow[] }) {
  const [tab, setTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [featuredState, setFeaturedState] = useState<Record<string, boolean>>(
    Object.fromEntries(events.map(e => [e.id, e.featured]))
  )
  const [cancelled, setCancelled] = useState<Record<string, boolean>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [pending, startAction] = useTransition()
  const [inviteMsg, setInviteMsg] = useState<Record<string, string>>({})

  function toggleFeatured(id: string) {
    const next = !featuredState[id]
    setFeaturedState(s => ({ ...s, [id]: next })) // optimistic
    startAction(async () => {
      const r = await toggleEventFeaturedAction(id)
      if (!r.ok) setFeaturedState(s => ({ ...s, [id]: !next })) // revert on failure
    })
  }

  function cancelEvent(id: string) {
    setActiveMenu(null)
    if (!confirm("Cancel this event? Registrants will no longer see it as upcoming.")) return
    setCancelled(c => ({ ...c, [id]: true })) // optimistic
    startAction(async () => {
      const r = await cancelEventAction(id)
      if (!r.ok) setCancelled(c => ({ ...c, [id]: false }))
    })
  }

  function inviteAll(id: string) {
    setActiveMenu(null)
    startAction(async () => {
      const r = await inviteAllToEventAction(id)
      setInviteMsg(m => ({ ...m, [id]: r.ok ? "Invites scheduled — going out in priority waves" : (r.error ?? "Failed") }))
    })
  }

  function statusOf(e: AdminEventRow): AdminEventRow["status"] {
    return cancelled[e.id] ? "cancelled" : e.status
  }

  const filtered = events.filter(e => {
    const status = statusOf(e)
    if (tab !== "all" && status !== tab) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const upcomingCount = events.filter(e => statusOf(e) === "upcoming").length
  const totalGoing = events.reduce((sum, e) => sum + e.going, 0)
  const revenueYtd = events.reduce((sum, e) => sum + e.revenuePaise, 0)
  const draftCount = events.filter(e => statusOf(e) === "draft").length

  return (
    <div>
      <PageHeader
        title="Events"
        description="Feature, cancel, and manage all platform events"
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" weight="duotone" /> Create Event
          </Button>
        }
      />

      <CreateEventModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Upcoming Events" value={String(upcomingCount)} icon={<CalendarCheck className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="Total Registrations" value={totalGoing.toLocaleString("en-IN")} icon={<Users className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Event Revenue" value={`Rs ${(revenueYtd / 100).toLocaleString("en-IN")}`} icon={<CurrencyInr className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Drafts" value={String(draftCount)} icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
      </div>

      {/* Toolbar */}
      <div className="rounded-lg border border-zinc-800 bg-[#111113] overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-zinc-800">
          <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 overflow-x-auto">
            {(["all", "upcoming", "draft", "past", "cancelled"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize whitespace-nowrap transition-colors ${tab === t ? "bg-[#111113] text-blue-400 shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}>
                {t}
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
                const status = statusOf(e)
                return (
                  <Tr key={e.id}>
                    <Td>
                      <div className="flex items-center gap-2.5 min-w-[220px]">
                        <button
                          onClick={() => toggleFeatured(e.id)}
                          disabled={pending}
                          title={featuredState[e.id] ? "Unfeature" : "Feature on homepage"}
                          className="flex-shrink-0 disabled:opacity-50"
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
                    <Td className="text-xs font-semibold text-zinc-300 tabular-nums whitespace-nowrap">{e.going} going</Td>
                    <Td className="text-xs font-bold text-zinc-300 tabular-nums whitespace-nowrap">{formatRevenue(e)}</Td>
                    <Td><StatusBadge status={status} /></Td>
                    <Td className="relative">
                      <button onClick={() => setActiveMenu(activeMenu === e.id ? null : e.id)}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800">
                        <DotsThreeVertical className="h-4 w-4" weight="duotone" />
                      </button>
                      {activeMenu === e.id && (
                        <div className="absolute right-4 top-10 z-20 w-52 rounded-lg border border-zinc-800 bg-[#111113] py-1 shadow-xl">
                          <button
                            onClick={() => inviteAll(e.id)}
                            disabled={pending}
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
                          <button
                            onClick={() => cancelEvent(e.id)}
                            disabled={pending || status === "cancelled"}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 disabled:opacity-40"
                          >
                            <Trash className="h-4 w-4" weight="duotone" /> Cancel event
                          </button>
                        </div>
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
