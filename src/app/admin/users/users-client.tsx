"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  MagnifyingGlass, Funnel, DownloadSimple, UserPlus, DotsThreeVertical, Eye,
  ShieldCheck, Prohibit, Trash, EnvelopeSimple, CaretLeft, CaretRight,
  Users, UserCheck, UserMinus, Clock, X, Key, Crown, PencilSimple,
  Sparkle, Medal, ClockCounterClockwise, UploadSimple,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, Table, Thead, Tbody, Tr, Th, Td, Button } from "../admin-ui"

export interface AdminUser {
  id: string
  name: string
  email: string
  username: string
  legalName?: string
  displayName?: string
  batch: string
  house: string
  houseColor: string
  houseId?: string
  batchId?: string
  membership: string
  status: string
  karma: number
  badgeIds?: string[]
  joined: string
  lastActive: string
}

export interface IdName { id: string; name?: string; label?: string }
interface KarmaHistoryRow { id: string; actionType: string; applied: number; reason: string | null; at: string }

export const MOCK_USERS: AdminUser[] = [
  { id: "u1", name: "Neha Gupta", email: "neha.gupta@gmail.com", username: "neha-gupta", batch: "2008", house: "Udaigiri", houseColor: "#ffe135", membership: "premium", status: "active", karma: 1240, joined: "Jan 2025", lastActive: "2 min ago" },
  { id: "u2", name: "Dr. Amit Verma", email: "amit.verma@gmail.com", username: "amit-verma", batch: "2005", house: "Aravali", houseColor: "#5a9bd5", membership: "life", status: "active", karma: 2890, joined: "Dec 2024", lastActive: "1 hr ago" },
  { id: "u3", name: "Priya Sharma", email: "priya.s@outlook.com", username: "priya-sharma", batch: "2010", house: "Nilgiri", houseColor: "#70ad47", membership: "associate", status: "active", karma: 876, joined: "Feb 2025", lastActive: "Today" },
  { id: "u4", name: "Vikram Singh", email: "vikram.singh@gmail.com", username: "vikram-singh", batch: "2007", house: "Shiwalik", houseColor: "#e8503a", membership: "premium", status: "active", karma: 1530, joined: "Jan 2025", lastActive: "Yesterday" },
  { id: "u5", name: "Ananya Deshmukh", email: "ananya.d@gmail.com", username: "ananya-deshmukh", batch: "2016", house: "Indira", houseColor: "#ff9933", membership: "student", status: "pending", karma: 12, joined: "Today", lastActive: "12 min ago" },
  { id: "u6", name: "Rohan Kulkarni", email: "rohan.k@outlook.com", username: "rohan-kulkarni", batch: "2011", house: "Laxmi", houseColor: "#e75480", membership: "student", status: "pending", karma: 0, joined: "Today", lastActive: "1 hr ago" },
  { id: "u7", name: "Rahul Mehta", email: "rahul.mehta@gmail.com", username: "rahul-mehta", batch: "2012", house: "Aravali", houseColor: "#5a9bd5", membership: "student", status: "active", karma: 445, joined: "Mar 2025", lastActive: "3 days ago" },
  { id: "u8", name: "Sunita Patel", email: "sunita.p@gmail.com", username: "sunita-patel", batch: "2009", house: "Nilgiri", houseColor: "#70ad47", membership: "associate", status: "active", karma: 990, joined: "Feb 2025", lastActive: "Today" },
  { id: "u9", name: "Deepak Wankhede", email: "deepak.w@gmail.com", username: "deepak-wankhede", batch: "2014", house: "Shiwalik", houseColor: "#e8503a", membership: "student", status: "suspended", karma: -45, joined: "Jan 2025", lastActive: "2 weeks ago" },
  { id: "u10", name: "Kavya Reddy", email: "kavya.r@gmail.com", username: "kavya-reddy", batch: "2013", house: "Udaigiri", houseColor: "#ffe135", membership: "student", status: "active", karma: 230, joined: "Apr 2025", lastActive: "5 hrs ago" },
]

const HOUSES = ["All Houses", "Aravali", "Nilgiri", "Shiwalik", "Udaigiri", "Jawahar", "Tilak", "Subhash", "Rajiv", "Indira", "Laxmi"]
const STATUSES = ["All Statuses", "active", "pending", "suspended"]
const MEMBERSHIPS = ["All Plans", "student", "associate", "premium", "life"]

export interface UsersQuery { page: number; q: string; house: string; status: string; plan: string }
export interface UsersPageInfo { page: number; pageCount: number; filteredTotal: number; pageSize: number }

export default function AdminUsersClient({
  users = MOCK_USERS,
  stats,
  query,
  pageInfo,
  houseOptions = [],
  batchOptions = [],
  badgeOptions = [],
}: {
  users?: AdminUser[]
  stats?: { total: number; verified: number; pending: number; suspended: number }
  query?: UsersQuery
  pageInfo?: UsersPageInfo
  houseOptions?: IdName[]
  batchOptions?: IdName[]
  badgeOptions?: IdName[]
}) {
  const router = useRouter()
  const q0 = query ?? { page: 1, q: "", house: "", status: "", plan: "" }

  // Server does the filtering/pagination; these controls just push to the URL.
  // "" (empty) is the sentinel for "all".
  function pushQuery(patch: Partial<UsersQuery>) {
    const next = { ...q0, ...patch }
    // Any filter/search change resets to page 1 unless the patch sets page.
    if (patch.page === undefined) next.page = 1
    const params = new URLSearchParams()
    if (next.q) params.set("q", next.q)
    if (next.house) params.set("house", next.house)
    if (next.status) params.set("status", next.status)
    if (next.plan) params.set("plan", next.plan)
    if (next.page > 1) params.set("page", String(next.page))
    const qs = params.toString()
    router.push(qs ? `/admin/users?${qs}` : "/admin/users")
  }

  const [search, setSearch] = useState(q0.q)
  const [showFilters, setShowFilters] = useState(!!(q0.house || q0.status || q0.plan))
  const houseFilter = q0.house || "All Houses"
  const statusFilter = q0.status || "All Statuses"
  const planFilter = q0.plan || "All Plans"
  const setHouseFilter = (v: string) => pushQuery({ house: v === "All Houses" ? "" : v })
  const setStatusFilter = (v: string) => pushQuery({ status: v === "All Statuses" ? "" : v })
  const setPlanFilter = (v: string) => pushQuery({ plan: v === "All Plans" ? "" : v })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const page = pageInfo?.page ?? 1
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [edit, setEdit] = useState({ legalName: "", displayName: "", email: "", membership: "free", houseId: "", batchId: "" })
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState<string | null>(null)

  function openEdit(u: AdminUser) {
    setActiveMenu(null)
    setEditErr(null)
    setEditUser(u)
    setEdit({
      legalName: u.legalName ?? u.name,
      displayName: u.displayName ?? "",
      email: u.email,
      membership: u.membership,
      houseId: u.houseId ?? "",
      batchId: u.batchId ?? "",
    })
  }

  async function submitEdit() {
    if (!editUser) return
    setEditBusy(true)
    setEditErr(null)
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: edit.legalName,
          displayName: edit.displayName || null,
          email: edit.email,
          membershipStatus: edit.membership,
          houseId: edit.houseId || null,
          batchId: edit.batchId || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Save failed")
      setToast(`Updated ${edit.legalName}`)
      setEditUser(null)
      router.refresh()
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "Save failed")
    } finally {
      setEditBusy(false)
    }
  }

  // Manual karma adjust
  const [karmaUser, setKarmaUser] = useState<AdminUser | null>(null)
  const [karmaDelta, setKarmaDelta] = useState("")
  const [karmaReason, setKarmaReason] = useState("")
  const [karmaErr, setKarmaErr] = useState<string | null>(null)

  async function submitKarma() {
    if (!karmaUser) return
    const delta = parseInt(karmaDelta, 10)
    if (!delta || Number.isNaN(delta)) { setKarmaErr("Enter a non-zero whole number"); return }
    setBusy(true); setKarmaErr(null)
    try {
      const res = await fetch(`/api/admin/users/${karmaUser.id}/karma`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, reason: karmaReason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Adjust failed")
      setToast(`Karma ${delta > 0 ? "+" : ""}${delta} → ${json.balance}`)
      setKarmaUser(null); setKarmaDelta(""); setKarmaReason(""); router.refresh()
    } catch (e) {
      setKarmaErr(e instanceof Error ? e.message : "Adjust failed")
    } finally { setBusy(false) }
  }

  // Karma history
  const [historyUser, setHistoryUser] = useState<AdminUser | null>(null)
  const [history, setHistory] = useState<KarmaHistoryRow[] | null>(null)

  async function openHistory(u: AdminUser) {
    setActiveMenu(null); setHistoryUser(u); setHistory(null)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/karma`)
      const json = await res.json()
      setHistory(res.ok ? json.history : [])
    } catch { setHistory([]) }
  }

  // Badges
  const [badgeUser, setBadgeUser] = useState<AdminUser | null>(null)
  const [badgeSet, setBadgeSet] = useState<Set<string>>(new Set())

  function openBadges(u: AdminUser) {
    setActiveMenu(null); setBadgeUser(u); setBadgeSet(new Set(u.badgeIds ?? []))
  }

  async function toggleBadge(badgeId: string) {
    if (!badgeUser) return
    const add = !badgeSet.has(badgeId)
    setBadgeSet(s => { const n = new Set(s); add ? n.add(badgeId) : n.delete(badgeId); return n })
    try {
      const res = await fetch(`/api/admin/users/${badgeUser.id}/badges`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeId, action: add ? "add" : "remove" }),
      })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      // Revert optimistic toggle on failure.
      setBadgeSet(s => { const n = new Set(s); add ? n.delete(badgeId) : n.add(badgeId); return n })
      setToast("Badge update failed")
    }
  }

  // CSV import
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [importBusy, setImportBusy] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  async function submitImport() {
    setImportBusy(true); setImportResult(null)
    try {
      const res = await fetch("/api/admin/users/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: importText }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Import failed")
      setImportResult(`Created ${json.created}, skipped ${json.skipped}, failed ${json.failed}`)
      router.refresh()
    } catch (e) {
      setImportResult(e instanceof Error ? e.message : "Import failed")
    } finally { setImportBusy(false) }
  }

  // Debounce search box → URL (avoid a navigation per keystroke).
  useEffect(() => {
    if (search === q0.q) return
    const t = setTimeout(() => pushQuery({ q: search }), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function runAction(id: string, action: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setActiveMenu(null)
    setBusy(true)
    setToast(null)
    try {
      const res = await fetch(`/api/admin/users/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Action failed")
      setToast(`Done: ${action}`)
      router.refresh()
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Action failed")
    } finally {
      setBusy(false)
    }
  }

  async function runBulk(action: string) {
    setBusy(true)
    setToast(null)
    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Bulk action failed")
      setToast(`${action}: ${json.done}/${json.requested} updated`)
      setSelected(new Set())
      router.refresh()
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Bulk action failed")
    } finally {
      setBusy(false)
    }
  }

  async function submitInvite() {
    setInviteBusy(true)
    setInviteMsg(null)
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, legalName: inviteName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to invite")
      setInviteMsg(`Activation email sent to ${inviteEmail}`)
      setInviteEmail("")
      setInviteName("")
    } catch (e) {
      setInviteMsg(e instanceof Error ? e.message : "Failed to invite")
    } finally {
      setInviteBusy(false)
    }
  }

  // Server already filtered + paginated; render the rows as-is.
  const filtered = users

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
            <Button variant="ghost" size="sm" onClick={() => { setImportOpen(true); setImportResult(null) }}>
              <UploadSimple className="h-3.5 w-3.5" weight="duotone" /> Import CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { window.location.href = "/api/admin/users/export" }}>
              <DownloadSimple className="h-3.5 w-3.5" weight="duotone" /> Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => { setInviteOpen(true); setInviteMsg(null) }}>
              <UserPlus className="h-3.5 w-3.5" weight="duotone" /> Invite User
            </Button>
          </>
        }
      />

      {toast && (
        <div className="mb-4 flex items-center justify-between rounded-[4px] border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-zinc-300"><X className="h-4 w-4" weight="duotone" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Users" value={(stats?.total ?? users.length).toLocaleString()} icon={<Users className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Verified" value={(stats?.verified ?? 0).toLocaleString()} icon={<UserCheck className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Pending Approval" value={(stats?.pending ?? 0).toLocaleString()} icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Suspended" value={(stats?.suspended ?? 0).toLocaleString()} icon={<UserMinus className="h-4.5 w-4.5" weight="duotone" />} accent="rose" />
      </div>

      {/* Toolbar */}
      <div className="rounded-[4px] border border-zinc-800 bg-[#111113] overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-zinc-800">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" weight="duotone" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-950 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-1.5 rounded-[4px] border px-3 py-2 text-xs font-semibold transition-colors ${showFilters ? "border-blue-800 bg-blue-950/40 text-blue-300" : "border-zinc-800 text-zinc-300 hover:bg-zinc-800"}`}
          >
            <Funnel className="h-3.5 w-3.5" weight="duotone" /> Filters
            {(houseFilter !== "All Houses" || statusFilter !== "All Statuses" || planFilter !== "All Plans") && (
              <span className="h-1.5 w-1.5 rounded-[3px] bg-blue-500" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 border-b border-zinc-800 bg-zinc-900/40">
            {[
              { label: "House", value: houseFilter, set: setHouseFilter, options: HOUSES },
              { label: "Status", value: statusFilter, set: setStatusFilter, options: STATUSES },
              { label: "Membership", value: planFilter, set: setPlanFilter, options: MEMBERSHIPS },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">{f.label}</label>
                <select
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-2.5 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500 capitalize"
                >
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-950/30 border-b border-blue-900">
            <span className="text-xs font-semibold text-blue-300">{selected.size} selected</span>
            <div className="flex gap-1.5 ml-2">
              <button disabled={busy} onClick={() => runBulk("verify")} className="flex items-center gap-1 rounded-[3px] bg-[#111113] border border-blue-800 px-2.5 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-950/50 disabled:opacity-50">
                <ShieldCheck className="h-3 w-3" weight="duotone" /> Verify
              </button>
              <button disabled={busy} onClick={() => runBulk("activate")} className="flex items-center gap-1 rounded-[3px] bg-[#111113] border border-emerald-800 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-950/50 disabled:opacity-50">
                <UserCheck className="h-3 w-3" weight="duotone" /> Activate
              </button>
              <button disabled={busy} onClick={() => runBulk("suspend")} className="flex items-center gap-1 rounded-[3px] bg-[#111113] border border-rose-800 px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-950/50 disabled:opacity-50">
                <Prohibit className="h-3 w-3" weight="duotone" /> Suspend
              </button>
            </div>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" weight="duotone" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr className="hover:bg-transparent">
                <Th className="w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 accent-blue-600" />
                </Th>
                {["Member", "Batch / House", "Membership", "Karma", "Status", "Last Active", ""].map((h, i) => (
                  <Th key={i} className="whitespace-nowrap">{h}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map(u => (
                <Tr key={u.id} className={selected.has(u.id) ? "bg-blue-950/20" : ""}>
                  <Td>
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} className="h-3.5 w-3.5 accent-blue-600" />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2.5 min-w-[180px]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[11px] font-bold text-white flex-shrink-0" style={{ backgroundColor: u.houseColor === "#ffe135" ? "#d4a017" : u.houseColor }}>
                        {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 truncate flex items-center gap-1">
                          {u.name}
                          {u.membership === "life" && <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" weight="duotone" />}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <p className="text-xs text-zinc-300">Batch {u.batch}</p>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: u.houseColor }} />
                      {u.house}
                    </p>
                  </Td>
                  <Td><StatusBadge status={u.membership} /></Td>
                  <Td className="text-xs font-bold tabular-nums whitespace-nowrap">
                    <span className={u.karma < 0 ? "text-rose-400" : "text-zinc-300"}>{u.karma.toLocaleString()}</span>
                  </Td>
                  <Td><StatusBadge status={u.status} /></Td>
                  <Td className="text-xs text-zinc-500 whitespace-nowrap">{u.lastActive}</Td>
                  <Td className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === u.id ? null : u.id)}
                      className="p-1.5 rounded-[3px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                    >
                      <DotsThreeVertical className="h-4 w-4" weight="duotone" />
                    </button>
                    {activeMenu === u.id && (
                      <div className="absolute right-4 top-10 z-20 w-48 rounded-[4px] border border-zinc-800 bg-[#111113] py-1 shadow-xl">
                        <a href={u.username ? `/profile/${u.username}` : "#"} target="_blank" rel="noreferrer" onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                          <Eye className="h-4 w-4" weight="duotone" /> View profile
                        </a>
                        <button onClick={() => openEdit(u)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                          <PencilSimple className="h-4 w-4" weight="duotone" /> Edit user
                        </button>
                        <button onClick={() => runAction(u.id, "verify")} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                          <ShieldCheck className="h-4 w-4" weight="duotone" /> Verify account
                        </button>
                        <button onClick={() => runAction(u.id, "reset-password")} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                          <Key className="h-4 w-4" weight="duotone" /> Reset password
                        </button>
                        <button onClick={() => { setActiveMenu(null); setKarmaUser(u); setKarmaDelta(""); setKarmaReason(""); setKarmaErr(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                          <Sparkle className="h-4 w-4" weight="duotone" /> Adjust karma
                        </button>
                        <button onClick={() => openHistory(u)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                          <ClockCounterClockwise className="h-4 w-4" weight="duotone" /> Karma history
                        </button>
                        <button onClick={() => openBadges(u)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                          <Medal className="h-4 w-4" weight="duotone" /> Manage badges
                        </button>
                        <a href={`mailto:${u.email}`} onClick={() => setActiveMenu(null)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                          <EnvelopeSimple className="h-4 w-4" weight="duotone" /> Send email
                        </a>
                        <div className="my-1 border-t border-zinc-800" />
                        <button onClick={() => runAction(u.id, u.status === "suspended" ? "activate" : "suspend")} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-amber-400 hover:bg-amber-950/40">
                          <Prohibit className="h-4 w-4" weight="duotone" /> {u.status === "suspended" ? "Unsuspend" : "Suspend"}
                        </button>
                        <button onClick={() => runAction(u.id, "delete", `Delete ${u.name}? This soft-deletes the account.`)} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40">
                          <Trash className="h-4 w-4" weight="duotone" /> Delete account
                        </button>
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 && (
                <Tr>
                  <Td colSpan={8} className="text-center py-12">
                    <Users className="h-8 w-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
                    <p className="text-sm font-medium text-zinc-400">No users match your filters</p>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>

        {/* Pagination */}
        {(() => {
          const total = pageInfo?.filteredTotal ?? filtered.length
          const size = pageInfo?.pageSize ?? filtered.length
          const last = pageInfo?.pageCount ?? 1
          const from = total === 0 ? 0 : (page - 1) * size + 1
          const to = Math.min(page * size, total)
          // Compact window: current ±2, clamped to [1, last].
          const start = Math.max(1, Math.min(page - 2, last - 4))
          const nums = Array.from({ length: Math.min(5, last) }, (_, i) => start + i).filter(p => p <= last)
          return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">Showing <span className="font-semibold text-zinc-300">{from}–{to}</span> of <span className="font-semibold text-zinc-300">{total.toLocaleString()}</span> users</p>
              <div className="flex items-center gap-1">
                <button onClick={() => pushQuery({ page: page - 1 })} className="p-1.5 rounded-[3px] border border-zinc-800 text-zinc-500 hover:bg-zinc-800 disabled:opacity-40" disabled={page <= 1}>
                  <CaretLeft className="h-4 w-4" weight="duotone" />
                </button>
                {nums.map(p => (
                  <button key={p} onClick={() => pushQuery({ page: p })}
                    className={`h-7 w-7 rounded-[3px] text-xs font-semibold ${page === p ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}>
                    {p}
                  </button>
                ))}
                {nums[nums.length - 1] < last && <span className="text-xs text-zinc-500 px-1">… {last}</span>}
                <button onClick={() => pushQuery({ page: page + 1 })} className="p-1.5 rounded-[3px] border border-zinc-800 text-zinc-500 hover:bg-zinc-800 disabled:opacity-40" disabled={page >= last}>
                  <CaretRight className="h-4 w-4" weight="duotone" />
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      {karmaUser && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setKarmaUser(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-[4px] border border-zinc-800 bg-[#111113] p-6 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100">Adjust Karma</h3>
              <button onClick={() => setKarmaUser(null)} className="text-zinc-500 hover:text-zinc-300"><X className="h-5 w-5" weight="duotone" /></button>
            </div>
            <p className="mb-4 text-xs text-zinc-500">{karmaUser.name} · current {karmaUser.karma.toLocaleString()}. Admin override — bypasses daily caps.</p>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-zinc-300">Delta (+ or −)</span>
              <input value={karmaDelta} onChange={(e) => setKarmaDelta(e.target.value)} inputMode="numeric" placeholder="e.g. 50 or -20" className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-zinc-300">Reason</span>
              <input value={karmaReason} onChange={(e) => setKarmaReason(e.target.value)} placeholder="Why this adjustment?" className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
            </label>
            {karmaErr && <div className="mb-3 rounded-[3px] bg-rose-950/40 border border-rose-900 px-3 py-2 text-xs text-rose-300">{karmaErr}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setKarmaUser(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={submitKarma} disabled={busy || !karmaDelta || !karmaReason}>{busy ? "Saving…" : "Apply"}</Button>
            </div>
          </div>
        </div>
      )}

      {historyUser && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setHistoryUser(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-[4px] border border-zinc-800 bg-[#111113] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100">Karma History · {historyUser.name}</h3>
              <button onClick={() => setHistoryUser(null)} className="text-zinc-500 hover:text-zinc-300"><X className="h-5 w-5" weight="duotone" /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {history === null && <p className="py-8 text-center text-xs text-zinc-500">Loading…</p>}
              {history?.length === 0 && <p className="py-8 text-center text-xs text-zinc-500">No karma transactions</p>}
              {history && history.length > 0 && (
                <table className="w-full text-left text-xs">
                  <thead><tr className="text-[11px] uppercase text-zinc-500"><th className="py-2">When</th><th className="py-2">Action</th><th className="py-2 text-right">Δ</th><th className="py-2">Reason</th></tr></thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-t border-zinc-900">
                        <td className="py-2 text-zinc-400 whitespace-nowrap">{new Date(h.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="py-2"><span className="rounded-[3px] bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">{h.actionType}</span></td>
                        <td className={`py-2 text-right font-bold tabular-nums ${h.applied < 0 ? "text-rose-400" : "text-emerald-400"}`}>{h.applied > 0 ? "+" : ""}{h.applied}</td>
                        <td className="py-2 text-zinc-500">{h.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {badgeUser && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setBadgeUser(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-[4px] border border-zinc-800 bg-[#111113] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100">Badges · {badgeUser.name}</h3>
              <button onClick={() => setBadgeUser(null)} className="text-zinc-500 hover:text-zinc-300"><X className="h-5 w-5" weight="duotone" /></button>
            </div>
            {badgeOptions.length === 0 && <p className="py-6 text-center text-xs text-zinc-500">No badges defined yet</p>}
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {badgeOptions.map((b) => (
                <label key={b.id} className="flex items-center gap-2.5 rounded-[3px] px-2 py-1.5 hover:bg-zinc-800 cursor-pointer">
                  <input type="checkbox" checked={badgeSet.has(b.id)} onChange={() => toggleBadge(b.id)} className="h-3.5 w-3.5 accent-blue-600" />
                  <span className="text-xs text-zinc-200">{b.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setBadgeUser(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setImportOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[4px] border border-zinc-800 bg-[#111113] p-6 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100">Import Users (CSV)</h3>
              <button onClick={() => setImportOpen(false)} className="text-zinc-500 hover:text-zinc-300"><X className="h-5 w-5" weight="duotone" /></button>
            </div>
            <p className="mb-3 text-xs text-zinc-500">One row per user: <code className="text-zinc-400">Name,email</code>. Each gets an activation email. Existing emails are skipped. Max 500 rows.</p>
            <input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(setImportText) }} className="mb-2 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-[3px] file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:text-zinc-200" />
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6} placeholder={"Neha Gupta,neha@example.com\nAmit Verma,amit@example.com"} className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none" />
            {importResult && <div className="mt-3 rounded-[3px] bg-zinc-900 px-3 py-2 text-xs text-zinc-300">{importResult}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>Close</Button>
              <Button variant="primary" size="sm" onClick={submitImport} disabled={importBusy || !importText.trim()}>{importBusy ? "Importing…" : "Import"}</Button>
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditUser(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[4px] border border-zinc-800 bg-[#111113] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100">Edit User</h3>
              <button onClick={() => setEditUser(null)} className="text-zinc-500 hover:text-zinc-300"><X className="h-5 w-5" weight="duotone" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-zinc-300">Legal name</span>
                <input value={edit.legalName} onChange={(e) => setEdit(s => ({ ...s, legalName: e.target.value }))} className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-zinc-300">Display name</span>
                <input value={edit.displayName} onChange={(e) => setEdit(s => ({ ...s, displayName: e.target.value }))} placeholder="Optional" className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-zinc-300">Email</span>
                <input type="email" value={edit.email} onChange={(e) => setEdit(s => ({ ...s, email: e.target.value }))} className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-300">House</span>
                  <select value={edit.houseId} onChange={(e) => setEdit(s => ({ ...s, houseId: e.target.value }))} className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-2.5 py-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none">
                    <option value="">— None —</option>
                    {houseOptions.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-300">Batch</span>
                  <select value={edit.batchId} onChange={(e) => setEdit(s => ({ ...s, batchId: e.target.value }))} className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-2.5 py-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none">
                    <option value="">— None —</option>
                    {batchOptions.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-zinc-300">Membership</span>
                <select value={edit.membership} onChange={(e) => setEdit(s => ({ ...s, membership: e.target.value }))} className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-2.5 py-2 text-xs text-zinc-200 capitalize focus:border-blue-500 focus:outline-none">
                  {["free", "student", "associate", "premium", "life", "committee", "inactive"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            </div>
            {editErr && <div className="mt-3 rounded-[3px] bg-rose-950/40 border border-rose-900 px-3 py-2 text-xs text-rose-300">{editErr}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={submitEdit} disabled={editBusy || !edit.legalName || !edit.email}>
                {editBusy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setInviteOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[4px] border border-zinc-800 bg-[#111113] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100">Invite User</h3>
              <button onClick={() => setInviteOpen(false)} className="text-zinc-500 hover:text-zinc-300"><X className="h-5 w-5" weight="duotone" /></button>
            </div>
            <p className="mb-4 text-xs text-zinc-500">Creates an account and emails a link to set their own password. No default password is stored.</p>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-zinc-300">Legal name</span>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" placeholder="Full name as on records" />
            </label>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-semibold text-zinc-300">Email</span>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" placeholder="name@example.com" />
            </label>
            {inviteMsg && <div className="mb-3 rounded-[3px] bg-zinc-900 px-3 py-2 text-xs text-zinc-300">{inviteMsg}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={submitInvite} disabled={inviteBusy || !inviteEmail || !inviteName}>
                <EnvelopeSimple className="h-3.5 w-3.5" weight="duotone" /> {inviteBusy ? "Sending…" : "Send activation email"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
