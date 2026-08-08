"use client"

import { useState, useTransition } from "react"
import {
  UsersThree, Plus, MagnifyingGlass, DotsThreeVertical, Eye, PencilSimple,
  Trash, Star, ChatCircle, ShieldCheck, UserGear, Globe,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, ProgressBar, Table, Thead, Tbody, Tr, Th, Td, Button } from "../admin-ui"
import type { AdminGroupRow } from "@/modules/groups/service"
import { deleteGroupAction } from "./actions"

export default function GroupsClient({ groups }: { groups: AdminGroupRow[] }) {
  const [search, setSearch] = useState("")
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<Record<string, boolean>>({})
  const [pending, startAction] = useTransition()

  function deleteGroup(id: string) {
    setActiveMenu(null)
    if (!confirm("Delete this group? Members and posts are removed. This can't be undone.")) return
    setDeleted(d => ({ ...d, [id]: true })) // optimistic
    startAction(async () => {
      const r = await deleteGroupAction(id)
      if (!r.ok) {
        setDeleted(d => ({ ...d, [id]: false }))
        alert(r.error ?? "Delete failed")
      }
    })
  }

  const visible = groups.filter(g => !deleted[g.id])
  const filtered = visible.filter(g =>
    !search || g.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalMembers = visible.reduce((s, g) => s + g.members, 0)
  const postsThisWeek = visible.reduce((s, g) => s + g.postsThisWeek, 0)
  const publicGroups = visible.filter(g => g.privacy === "public").length

  return (
    <div>
      <PageHeader
        title="Groups"
        description="Oversee community groups, their members, and activity"
        actions={
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" weight="duotone" /> Create Group
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Groups" value={String(visible.length)} icon={<UsersThree className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Total Memberships" value={totalMembers.toLocaleString("en-IN")} icon={<UserGear className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Posts This Week" value={String(postsThisWeek)} icon={<ChatCircle className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="Public Groups" value={String(publicGroups)} icon={<Globe className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" weight="duotone" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups..."
            className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-950 transition-all" />
        </div>
      </div>

      {/* Groups table */}
      <div className="rounded-[4px] border border-zinc-800 bg-[#111113] overflow-hidden">
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
                      {g.isPermanent && (
                        <span title="Permanent group" className="flex-shrink-0">
                          <Star className="h-4 w-4 text-amber-400" weight="fill" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{g.name}</p>
                        <p className="text-[11px] text-zinc-500 capitalize">{g.category} · created {g.created}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><StatusBadge status={g.privacy} /></Td>
                  <Td className="text-xs font-bold text-zinc-300 tabular-nums whitespace-nowrap">{g.members}</Td>
                  <Td className="whitespace-nowrap">
                    <p className="text-xs text-zinc-400 tabular-nums">{g.postsThisWeek} posts/wk</p>
                    <div className="mt-1 w-20"><ProgressBar value={g.postsThisWeek} max={40} color={g.postsThisWeek === 0 ? "#52525b" : "#3b82f6"} /></div>
                  </Td>
                  <Td className="text-xs text-zinc-400 whitespace-nowrap">{g.admins.length ? g.admins.join(", ") : "—"}</Td>
                  <Td className="text-xs text-zinc-500 whitespace-nowrap">{g.lastActivity}</Td>
                  <Td className="relative">
                    <button onClick={() => setActiveMenu(activeMenu === g.id ? null : g.id)}
                      className="p-1.5 rounded-[3px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800">
                      <DotsThreeVertical className="h-4 w-4" weight="duotone" />
                    </button>
                    {activeMenu === g.id && (
                      <div className="absolute right-4 top-10 z-20 w-48 rounded-[4px] border border-zinc-800 bg-[#111113] py-1 shadow-xl">
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
                        <button
                          onClick={() => deleteGroup(g.id)}
                          disabled={pending || g.isPermanent}
                          title={g.isPermanent ? "Permanent groups can't be deleted" : undefined}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 disabled:opacity-40"
                        >
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
    </div>
  )
}
