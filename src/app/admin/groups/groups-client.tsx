"use client"

import { useState } from "react"
import {
  UsersThree, Plus, MagnifyingGlass, DotsThreeVertical, Eye, PencilSimple,
  Trash, Star, ChatCircle, ShieldCheck, UserGear, Globe,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, ProgressBar, Table, Thead, Tbody, Tr, Th, Td, Button, useRowAction } from "../admin-ui"
import type { AdminGroupRow } from "@/modules/groups/service"
import { deleteGroupAction } from "./actions"

export default function GroupsClient({ groups }: { groups: AdminGroupRow[] }) {
  const [search, setSearch] = useState("")
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<Record<string, boolean>>({})
  const { run, isBusy } = useRowAction()

  function deleteGroup(id: string) {
    setActiveMenu(null)
    if (!confirm("Delete this group? Members and posts are removed. This can't be undone.")) return
    run(id, {
      optimistic: () => setDeleted(d => ({ ...d, [id]: true })),
      revert: () => setDeleted(d => ({ ...d, [id]: false })),
      action: async () => {
        const r = await deleteGroupAction(id)
        if (!r.ok) throw new Error(r.error ?? "Delete failed")
      },
      success: "Group deleted",
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
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" weight="duotone" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups..."
            className="w-full rounded-[4px] border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
        </div>
      </div>

      {/* Groups table */}
      <div className="rounded-[4px] border border-gray-200 bg-white overflow-hidden">
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
                          <Star className="h-4 w-4 text-amber-600" weight="fill" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{g.name}</p>
                        <p className="text-[11px] text-gray-500 capitalize">{g.category} · created {g.created}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><StatusBadge status={g.privacy} /></Td>
                  <Td className="text-xs font-bold text-gray-700 tabular-nums whitespace-nowrap">{g.members}</Td>
                  <Td className="whitespace-nowrap">
                    <p className="text-xs text-gray-600 tabular-nums">{g.postsThisWeek} posts/wk</p>
                    <div className="mt-1 w-20"><ProgressBar value={g.postsThisWeek} max={40} color={g.postsThisWeek === 0 ? "#e5e7eb" : "#3b82f6"} /></div>
                  </Td>
                  <Td className="text-xs text-gray-600 whitespace-nowrap">{g.admins.length ? g.admins.join(", ") : "—"}</Td>
                  <Td className="text-xs text-gray-500 whitespace-nowrap">{g.lastActivity}</Td>
                  <Td className="relative">
                    <button onClick={() => setActiveMenu(activeMenu === g.id ? null : g.id)}
                      className="p-1.5 rounded-[3px] text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                      <DotsThreeVertical className="h-4 w-4" weight="duotone" />
                    </button>
                    {activeMenu === g.id && (
                      <div className="absolute right-4 top-10 z-20 w-48 rounded-[4px] border border-gray-200 bg-white py-1 shadow-xl">
                        {[
                          { icon: <Eye className="h-4 w-4" weight="duotone" />, label: "View group" },
                          { icon: <PencilSimple className="h-4 w-4" weight="duotone" />, label: "Edit details" },
                          { icon: <UserGear className="h-4 w-4" weight="duotone" />, label: "Manage admins" },
                          { icon: <ShieldCheck className="h-4 w-4" weight="duotone" />, label: "Review group rules" },
                        ].map((item, i) => (
                          <button key={i} onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-100">
                            {item.icon}{item.label}
                          </button>
                        ))}
                        <div className="my-1 border-t border-gray-200" />
                        <button
                          onClick={() => deleteGroup(g.id)}
                          disabled={isBusy(g.id) || g.isPermanent}
                          title={g.isPermanent ? "Permanent groups can't be deleted" : undefined}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-40"
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
                    <UsersThree className="h-8 w-8 text-gray-400 mx-auto mb-2" weight="duotone" />
                    <p className="text-sm font-medium text-gray-600">No groups found</p>
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
