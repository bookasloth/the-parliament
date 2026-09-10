import { Eye, CursorClick, Percent, Target, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr"
import { requireAdmin } from "@/modules/auth/session"
import { firstParam } from "@/modules/admin/pagination"
import { getAdDelivery } from "@/modules/ads/service"
import { buildAdReport, reportTotals, type DeliveryStatus } from "@/modules/ads/dashboard"
import { adCatalog } from "@/config/ad-tracking"
import {
  PageHeader, StatCard, SectionHeader, ProgressBar,
  Table, Thead, Tbody, Tr, Th, Td, EmptyState,
} from "../admin-ui"

export const dynamic = "force-dynamic"

const nf = new Intl.NumberFormat("en-IN")
const DAY_MS = 24 * 60 * 60 * 1000
const WINDOWS = [7, 30, 90] as const

const STATUS: Record<DeliveryStatus, { label: string; badge: string; bar: string }> = {
  on_track: { label: "On track", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "#059669" },
  building: { label: "Building", badge: "bg-sky-50 text-sky-700 border-sky-200", bar: "#0284c7" },
  none: { label: "No delivery", badge: "bg-gray-100 text-gray-600 border-gray-300", bar: "#9ca3af" },
}

function PlacementChip({ placement }: { placement: string }) {
  return (
    <span className="inline-flex items-center rounded-[3px] border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
      {placement}
    </span>
  )
}

export default async function AdminAdsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()

  const sp = await searchParams
  const daysRaw = Number(firstParam(sp.days))
  const days: number = (WINDOWS as readonly number[]).includes(daysRaw) ? daysRaw : 30

  const now = new Date()
  // getAdDelivery's `to` is day-exclusive, so push it to tomorrow to include today.
  const to = new Date(now.getTime() + DAY_MS)
  const [windowRows, yearRows] = await Promise.all([
    getAdDelivery({ from: new Date(now.getTime() - days * DAY_MS), to }),
    getAdDelivery({ from: new Date(now.getTime() - 365 * DAY_MS), to }),
  ])

  const rows = buildAdReport(adCatalog(), windowRows, yearRows)
  const totals = reportTotals(rows)
  const noData = totals.impressions === 0 && rows.every((r) => r.yearImpressions === 0)

  return (
    <div>
      <PageHeader
        title="Ad Delivery"
        description="Verified impressions and clicks per slot — the numbers behind the ≥10,000/yr floor and make-good."
      />

      {/* Window selector */}
      <div className="mb-4 flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Window:</span>
        {WINDOWS.map((w) => {
          const active = w === days
          return (
            <a
              key={w}
              href={`/admin/ads?days=${w}`}
              className={`rounded-[4px] border px-2.5 py-1 text-xs font-semibold ${
                active ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {w}d
            </a>
          )
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={`Impressions (${days}d)`} value={nf.format(totals.impressions)} icon={<Eye className="h-5 w-5" weight="duotone" />} accent="indigo" />
        <StatCard label={`Clicks (${days}d)`} value={nf.format(totals.clicks)} icon={<CursorClick className="h-5 w-5" weight="duotone" />} accent="sky" />
        <StatCard label={`CTR (${days}d)`} value={`${(totals.ctr * 100).toFixed(2)}%`} icon={<Percent className="h-5 w-5" weight="duotone" />} accent="violet" />
        <StatCard label="Slots on track (1yr)" value={`${totals.onTrack} / ${totals.slots}`} icon={<Target className="h-5 w-5" weight="duotone" />} accent="emerald" />
      </div>

      {noData && (
        <p className="mt-3 rounded-[5px] border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
          No ad delivery recorded yet — these numbers populate as members view the feed and sidebar. Counts are
          daily-unique per member (a refresh never double-counts).
        </p>
      )}

      <div className="mt-3 rounded-[5px] border border-gray-200 bg-white p-4">
        <SectionHeader title="Delivery by slot" />
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr>
                <Th>Advertiser</Th>
                <Th>Impressions</Th>
                <Th>Clicks</Th>
                <Th>CTR</Th>
                <Th>To floor (1yr)</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.length === 0 && (
                <Tr>
                  <Td colSpan={6}>
                    <EmptyState title="No ad slots" description="Ad creatives will appear here once configured." />
                  </Td>
                </Tr>
              )}
              {rows.map((r) => {
                const s = STATUS[r.status]
                return (
                  <Tr key={`${r.adId}:${r.placement}`}>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-800">{r.name}</span>
                        {r.href && (
                          <a href={r.href} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600" aria-label={`Open ${r.name}`}>
                            <ArrowSquareOut className="h-3.5 w-3.5" weight="duotone" />
                          </a>
                        )}
                      </div>
                      <div className="mt-0.5"><PlacementChip placement={r.placement} /></div>
                    </Td>
                    <Td className="tabular-nums text-gray-700">{nf.format(r.impressions)}</Td>
                    <Td className="tabular-nums text-gray-700">{nf.format(r.clicks)}</Td>
                    <Td className="tabular-nums text-gray-600">{(r.ctr * 100).toFixed(1)}%</Td>
                    <Td>
                      <div className="min-w-[140px]">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                          <span className="tabular-nums">{nf.format(r.yearImpressions)} / {nf.format(r.floor)}</span>
                          {r.shortfall > 0 && <span className="tabular-nums text-gray-400">{nf.format(r.shortfall)} to go</span>}
                        </div>
                        <ProgressBar value={r.yearImpressions} max={r.floor} color={s.bar} />
                      </div>
                    </Td>
                    <Td>
                      <span className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold ${s.badge}`}>
                        {s.label}
                      </span>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </div>
        <p className="mt-3 text-[11px] text-gray-400">
          Impressions/clicks are daily-unique per member. &ldquo;To floor&rdquo; compares trailing-365-day
          impressions against the ₹3,650/slot annual guarantee (≥10,000 verified views, or the term is extended free).
        </p>
      </div>
    </div>
  )
}
