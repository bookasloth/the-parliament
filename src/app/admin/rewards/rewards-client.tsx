"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Gift, Coins, Package, Clock, CheckCircle, CaretLeft, CaretRight } from "@phosphor-icons/react"
import {
  PageHeader,
  StatCard,
  StatusBadge,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  EmptyState,
} from "../admin-ui"
import { setRewardActive, setRedemptionStatus } from "./actions"

export interface RewardItemRow {
  id: string
  title: string
  category: string
  karmaCost: number
  quantity: number | null
  deliveryType: string
  isActive: boolean
  isFeatured: boolean
  popularity: number
  redemptions: number
}

export interface RedemptionRow {
  id: string
  user: string
  reward: string
  karmaSpent: number
  status: string
  channel: string | null
  date: string
}

export interface RewardsStats {
  totalItems: number
  activeItems: number
  totalRedemptions: number
  pendingRedemptions: number
  karmaSpent: number
}

export interface RewardsQuery { page: number; status: string }
export interface RewardsPageInfo { page: number; pageCount: number; filteredTotal: number; pageSize: number }

const STATUS_OPTIONS = ["fulfilled", "pending", "refunded", "cancelled"] as const

export default function RewardsClient({
  items,
  redemptions,
  stats,
  query,
  pageInfo,
}: {
  items: RewardItemRow[]
  redemptions: RedemptionRow[]
  stats: RewardsStats
  query: RewardsQuery
  pageInfo: RewardsPageInfo
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn()
      router.refresh()
    })
  }

  function pushQuery(patch: Partial<RewardsQuery>) {
    const next = { ...query, ...patch }
    if (patch.page === undefined) next.page = 1
    const params = new URLSearchParams()
    if (next.status) params.set("status", next.status)
    if (next.page > 1) params.set("page", String(next.page))
    const qs = params.toString()
    router.push(qs ? `/admin/rewards?${qs}` : "/admin/rewards")
  }

  const total = pageInfo.filteredTotal
  const size = pageInfo.pageSize
  const page = pageInfo.page
  const last = pageInfo.pageCount
  const from = total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, total)
  const start = Math.max(1, Math.min(page - 2, last - 4))
  const nums = Array.from({ length: Math.min(5, last) }, (_, i) => start + i).filter((p) => p <= last)

  return (
    <div>
      <PageHeader title="Rewards" description="Redeemable reward items and the karma redemptions members have made" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Items" value={String(stats.totalItems)} icon={<Gift className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Active" value={String(stats.activeItems)} icon={<CheckCircle className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Redemptions" value={stats.totalRedemptions.toLocaleString()} icon={<Package className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="Pending" value={String(stats.pendingRedemptions)} icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Karma Spent" value={stats.karmaSpent.toLocaleString()} icon={<Coins className="h-4.5 w-4.5" weight="duotone" />} accent="violet" />
      </div>

      {/* ---- Reward items ---- */}
      <div className="rounded-[4px] border border-zinc-800 bg-[#111113] overflow-hidden mb-6">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-200">Reward Items</h2>
        </div>
        <div className="overflow-x-auto">
          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Gift className="h-6 w-6" weight="duotone" />} title="No reward items" description="Reward items will appear here once created." />
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Title</Th>
                  <Th>Category</Th>
                  <Th>Karma Cost</Th>
                  <Th>Qty</Th>
                  <Th>Delivery</Th>
                  <Th>Popularity</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((i) => (
                  <Tr key={i.id}>
                    <Td className="text-zinc-100 font-medium">{i.title}</Td>
                    <Td className="capitalize">{i.category}</Td>
                    <Td>{i.karmaCost.toLocaleString()}</Td>
                    <Td>{i.quantity ?? "∞"}</Td>
                    <Td className="capitalize">{i.deliveryType}</Td>
                    <Td>{i.popularity.toLocaleString()}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <StatusBadge status={i.isActive ? "active" : "archived"} />
                        {i.isFeatured && (
                          <span className="rounded-[3px] border border-amber-800 bg-amber-950/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">Featured</span>
                        )}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <Button
                        variant={i.isActive ? "ghost" : "primary"}
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => setRewardActive(i.id, !i.isActive))}
                      >
                        {i.isActive ? "Disable" : "Enable"}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>
      </div>

      {/* ---- Redemptions ---- */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-200">Redemptions</h2>
        <select
          value={query.status || "All"}
          onChange={(e) => pushQuery({ status: e.target.value === "All" ? "" : e.target.value })}
          className="rounded-[4px] border border-zinc-800 bg-[#111113] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-600 capitalize"
        >
          {["All", ...STATUS_OPTIONS].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-[4px] border border-zinc-800 bg-[#111113] overflow-hidden">
        <div className="overflow-x-auto">
          {redemptions.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Package className="h-6 w-6" weight="duotone" />} title="No redemptions" description="No redemptions match this filter." />
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>User</Th>
                  <Th>Reward</Th>
                  <Th>Karma Spent</Th>
                  <Th>Status</Th>
                  <Th>Channel</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {redemptions.map((r) => (
                  <Tr key={r.id}>
                    <Td className="text-zinc-100">{r.user}</Td>
                    <Td>{r.reward}</Td>
                    <Td>{r.karmaSpent.toLocaleString()}</Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td>{r.channel ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-zinc-400">{r.date}</Td>
                    <Td className="text-right">
                      {r.status === "pending" ? (
                        <Button size="sm" disabled={pending} onClick={() => run(() => setRedemptionStatus(r.id, "fulfilled"))}>
                          Mark fulfilled
                        </Button>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">Showing <span className="font-semibold text-zinc-300">{from}–{to}</span> of <span className="font-semibold text-zinc-300">{total.toLocaleString()}</span></p>
          <div className="flex items-center gap-1">
            <button onClick={() => pushQuery({ page: page - 1 })} className="p-1.5 rounded-[3px] border border-zinc-800 text-zinc-500 hover:bg-zinc-800 disabled:opacity-40" disabled={page <= 1}>
              <CaretLeft className="h-4 w-4" weight="duotone" />
            </button>
            {nums.map((p) => (
              <button key={p} onClick={() => pushQuery({ page: p })}
                className={`h-7 w-7 rounded-[3px] text-xs font-semibold ${page === p ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}>
                {p}
              </button>
            ))}
            {nums.length > 0 && nums[nums.length - 1] < last && <span className="text-xs text-zinc-500 px-1">… {last}</span>}
            <button onClick={() => pushQuery({ page: page + 1 })} className="p-1.5 rounded-[3px] border border-zinc-800 text-zinc-500 hover:bg-zinc-800 disabled:opacity-40" disabled={page >= last}>
              <CaretRight className="h-4 w-4" weight="duotone" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
