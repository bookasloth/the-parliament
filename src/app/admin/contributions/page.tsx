import { requireAdmin } from "@/modules/auth/session"
import { HandHeart, CheckCircle, Clock } from "@phosphor-icons/react/dist/ssr"
import { PageHeader, StatCard } from "../admin-ui"
import { listContributionsAdmin, getContributionStats } from "@/modules/contributions/service"
import { relativeTime } from "@/lib/relative-time"
import ContributionsClient, { type ContributionRow } from "./contributions-client"

export const dynamic = "force-dynamic"

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`

export default async function AdminContributionsPage() {
  await requireAdmin()

  // Defensive — the table may not exist until the migration is applied.
  let rows: ContributionRow[] = []
  let stats = { totalPaise: 0, paidCount: 0, pendingApproval: 0 }
  try {
    const [list, s] = await Promise.all([listContributionsAdmin(200), getContributionStats()])
    stats = s
    rows = list.map((c) => ({
      id: c.id,
      name: c.isAnonymous ? "Anonymous" : c.displayName ?? "—",
      kind: c.kind,
      tier: c.tier,
      amount: inr(c.amountPaise),
      status: c.status,
      showOnWall: c.showOnWall,
      isAnonymous: c.isAnonymous,
      approved: c.approved,
      websiteUrl: c.websiteUrl,
      time: relativeTime(c.createdAt),
    }))
  } catch {
    // table missing — render empty; the SQL in prisma/migrations must be applied.
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Contributions" description="Support NNAWCA payments and the /development sponsor wall. Approve names before they go public." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected" value={inr(stats.totalPaise)} icon={<HandHeart weight="duotone" />} accent="emerald" />
        <StatCard label="Paid contributions" value={String(stats.paidCount)} icon={<CheckCircle weight="duotone" />} accent="sky" />
        <StatCard label="Awaiting approval" value={String(stats.pendingApproval)} icon={<Clock weight="duotone" />} accent="amber" />
      </div>

      <ContributionsClient rows={rows} />
    </div>
  )
}
