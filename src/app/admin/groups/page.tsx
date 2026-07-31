"use client"

import { useState } from "react"
import {
  UsersThree, Plus, MagnifyingGlass, DotsThreeVertical, Eye, PencilSimple, Archive,
  Trash, Lock, Globe, Star, CheckCircle, XCircle, Clock,
  TrendUp, ChatCircle, ShieldCheck, UserGear,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, ProgressBar, Table, Thead, Tbody, Tr, Th, Td, Button } from "../admin-ui"

interface AdminGroup {
  id: string
  name: string
  category: string
  privacy: "public" | "private"
  members: number
  postsPerWeek: number
  admins: string[]
  created: string
  lastActivity: string
  status: "active" | "archived"
  featured: boolean
}

const groups: AdminGroup[] = [
  { id: "g1", name: "Batch 2010 Memories", category: "Batch", privacy: "private", members: 156, postsPerWeek: 24, admins: ["Priya Sharma"], created: "Jan 2025", lastActivity: "5 min ago", status: "active", featured: true },
  { id: "g2", name: "Career Advice & Mentorship", category: "Career", privacy: "public", members: 487, postsPerWeek: 38, admins: ["Neha Gupta", "Vikram Singh"], created: "Dec 2024", lastActivity: "12 min ago", status: "active", featured: true },
  { id: "g3", name: "UPSC Aspirants Circle", category: "Education", privacy: "public", members: 213, postsPerWeek: 19, admins: ["Neha Gupta"], created: "Feb 2025", lastActivity: "1 hr ago", status: "active", featured: false },
  { id: "g4", name: "Nagpur Local Chapter", category: "Regional", privacy: "public", members: 342, postsPerWeek: 15, admins: ["Vikram Singh"], created: "Jan 2025", lastActivity: "3 hrs ago", status: "active", featured: false },
  { id: "g5", name: "Alumni Entrepreneurs", category: "Business", privacy: "private", members: 94, postsPerWeek: 8, admins: ["Rahul Mehta"], created: "Mar 2025", lastActivity: "Yesterday", status: "active", featured: false },
  { id: "g6", name: "Cricket Lovers JNV", category: "Sports", privacy: "public", members: 178, postsPerWeek: 11, admins: ["Rahul Mehta"], created: "Feb 2025", lastActivity: "2 days ago", status: "active", featured: false },
  { id: "g7", name: "Old Photos Archive", category: "Nostalgia", privacy: "public", members: 51, postsPerWeek: 0, admins: ["Sunita Patel"], created: "Jan 2025", lastActivity: "3 weeks ago", status: "archived", featured: false },
]

const pendingRequests = [
  { id: "p1", name: "Medical Professionals Network", requester: "Dr. Amit Verma", category: "Professional", privacy: "private" as const, reason: "A dedicated space for alumni doctors to discuss referrals, opportunities, and medical camps for the school.", time: "2 hrs ago" },
  { id: "p2", name: "Batch 2018 Official", requester: "Karan Patil", category: "Batch", privacy: "private" as const, reason: "Our batch wants an official group to plan our 10-year reunion early.", time: "Yesterday" },
]

export default function AdminGroupsPage() {
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<"active" | "archived" | "requests">("active")
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [featuredState, setFeaturedState] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map(g => [g.id, g.featured]))
  )
  const [requestDecisions, setRequestDecisions] = useState<Record<string, "approved" | "rejected">>({})

  const filtered = groups.filter(g => {
    if (g.status !== (tab === "requests" ? "active" : tab)) return false
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const openRequests = pendingRequests.filter(r => !requestDecisions[r.id])

  return (
    <div>
      <PageHeader
        title="Groups"
        description="Oversee community groups, approve creation requests, and feature top communities"
        actions={
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" weight="duotone" /> Create Group
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Active Groups" value="24" icon={<UsersThree className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Total Memberships" value="1,521" delta="+9.2%" deltaUp icon={<TrendUp className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Posts This Week" value="115" icon={<ChatCircle className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="Creation Requests" value={String(openRequests.length)} icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-[#111113] p-1 w-fit">
          {([
            { key: "active", label: "Active Groups" },
            { key: "requests", label: "Creation Requests" },
            { key: "archived", label: "Archived" },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${tab === t.key ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
              {t.label}
              {t.key === "requests" && openRequests.length > 0 && <span className="ml-1.5 rounded-full bg-amber-400 text-amber-950 px-1.5 text-[10px] font-bold">{openRequests.length}</span>}
            </button>
          ))}
        </div>
        {tab !== "requests" && (
          <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" weight="duotone" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups..."
              className="w-full rounded-lg border border-zinc-800 bg-[#111113] pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-950 transition-all" />
          </div>
        )}
      </div>

      {/* Creation requests */}
      {tab === "requests" && (
        <div className="space-y-3">
          {openRequests.length === 0 && (
            <div className="rounded-lg border border-zinc-800 bg-[#111113] py-16 text-center">
              <CheckCircle className="h-8 w-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
              <p className="text-sm font-medium text-zinc-400">All requests handled</p>
            </div>
          )}
          {openRequests.map(req => (
            <div key={req.id} className="rounded-lg border border-zinc-800 bg-[#111113] p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-950/40 text-violet-400 flex-shrink-0">
                  {req.privacy === "private" ? <Lock className="h-4.5 w-4.5" weight="duotone" /> : <Globe className="h-4.5 w-4.5" weight="duotone" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-zinc-200">{req.name}</p>
                    <StatusBadge status={req.privacy} />
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{req.category}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">Requested by <span className="font-semibold text-zinc-300">{req.requester}</span> · {req.time}</p>
                </div>
              </div>
              <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-3 mb-3">
                <p className="text-xs text-zinc-300 italic">"{req.reason}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRequestDecisions(d => ({ ...d, [req.id]: "approved" }))}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500">
                  <CheckCircle className="h-3.5 w-3.5" weight="duotone" /> Approve Group
                </button>
                <button onClick={() => setRequestDecisions(d => ({ ...d, [req.id]: "rejected" }))}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-800 bg-[#111113] px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40">
                  <XCircle className="h-3.5 w-3.5" weight="duotone" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Groups table */}
      {tab !== "requests" && (
        <div className="rounded-lg border border-zinc-800 bg-[#111113] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr className="hover:bg-transparent">
                  {["Group", "Privacy", "Members", "Activity", "Admins", "Last Active", ""].map((h, i) => (
                    <Th key={i} className="whitespace-nowrap">{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map(g => (
                  <Tr key={g.id}>
                    <Td>
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        <button onClick={() => setFeaturedState(s => ({ ...s, [g.id]: !s[g.id] }))} title={featuredState[g.id] ? "Unfeature" : "Feature"} className="flex-shrink-0">
                          <Star className={`h-4 w-4 transition-colors ${featuredState[g.id] ? "text-amber-400" : "text-zinc-700 hover:text-amber-300"}`} weight={featuredState[g.id] ? "fill" : "duotone"} />
                        </button>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-200 truncate">{g.name}</p>
                          <p className="text-[11px] text-zinc-500">{g.category} · created {g.created}</p>
                        </div>
                      </div>
                    </Td>
                    <Td><StatusBadge status={g.privacy} /></Td>
                    <Td className="text-xs font-bold text-zinc-300 tabular-nums whitespace-nowrap">{g.members}</Td>
                    <Td className="whitespace-nowrap">
                      <p className="text-xs text-zinc-400 tabular-nums">{g.postsPerWeek} posts/wk</p>
                      <div className="mt-1 w-20"><ProgressBar value={g.postsPerWeek} max={40} color={g.postsPerWeek === 0 ? "#52525b" : "#3b82f6"} /></div>
                    </Td>
                    <Td className="text-xs text-zinc-400 whitespace-nowrap">{g.admins.join(", ")}</Td>
                    <Td className="text-xs text-zinc-500 whitespace-nowrap">{g.lastActivity}</Td>
                    <Td className="relative">
                      <button onClick={() => setActiveMenu(activeMenu === g.id ? null : g.id)}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800">
                        <DotsThreeVertical className="h-4 w-4" weight="duotone" />
                      </button>
                      {activeMenu === g.id && (
                        <div className="absolute right-4 top-10 z-20 w-48 rounded-lg border border-zinc-800 bg-[#111113] py-1 shadow-xl">
                          {[
                            { icon: <Eye className="h-4 w-4" weight="duotone" />, label: "View group" },
                            { icon: <PencilSimple className="h-4 w-4" weight="duotone" />, label: "Edit details" },
                            { icon: <UserGear className="h-4 w-4" weight="duotone" />, label: "Manage admins" },
                            { icon: <ShieldCheck className="h-4 w-4" weight="duotone" />, label: "Review group rules" },
                          ].map((item, i) => (
                            <button key={i} onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                              {item.icon}{item.label}
                            </button>
                          ))}
                          <div className="my-1 border-t border-zinc-800" />
                          <button onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-amber-400 hover:bg-amber-950/40">
                            <Archive className="h-4 w-4" weight="duotone" /> {g.status === "archived" ? "Restore" : "Archive"}
                          </button>
                          <button onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40">
                            <Trash className="h-4 w-4" weight="duotone" /> Delete group
                          </button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))}
                {filtered.length === 0 && (
                  <Tr>
                    <Td colSpan={7} className="text-center py-12">
                      <UsersThree className="h-8 w-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
                      <p className="text-sm font-medium text-zinc-400">No groups found</p>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
