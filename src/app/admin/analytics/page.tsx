import {
  Users,
  SealCheck,
  Note,
  ChatCircle,
  CalendarBlank,
  GameController,
  Coins,
  Gift,
} from "@phosphor-icons/react/dist/ssr"
import { prisma } from "@/lib/prisma"
import { PageHeader, StatCard, SectionHeader, BarChart, ProgressBar, Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "../admin-ui"

export const dynamic = "force-dynamic"

const nf = new Intl.NumberFormat("en-IN")

// Membership tier display order (unknown tiers still render, appended at the end).
const TIER_ORDER = ["free", "student", "associate", "premium", "life", "committee"]
const TIER_COLOR: Record<string, string> = {
  free: "#71717a",
  student: "#22c55e",
  associate: "#3b82f6",
  premium: "#2563eb",
  life: "#f59e0b",
  committee: "#a855f7",
}

export default async function AdminAnalyticsPage() {
  const now = new Date()
  const since = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    totalUsers,
    verifiedUsers,
    pendingVerification,
    tierGroups,
    postCount,
    commentCount,
    businessCount,
    eventCount,
    messageCount,
    gamePlays,
    redemptions,
    karmaAgg,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isVerified: true } }),
    prisma.user.count({ where: { deletedAt: null, verificationStatus: "pending" } }),
    prisma.user.groupBy({ by: ["membershipStatus"], where: { deletedAt: null }, _count: true }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.comment.count({ where: { deletedAt: null } }),
    prisma.business.count(),
    prisma.event.count(),
    prisma.message.count({ where: { deletedAt: null } }),
    prisma.gameScore.count(),
    prisma.karmaRedemption.count(),
    // KarmaTransaction has no `amount` column — appliedValue is the karma actually credited.
    prisma.karmaTransaction.aggregate({ _sum: { appliedValue: true } }),
    prisma.user.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ])

  const karmaIssued = Number(karmaAgg._sum.appliedValue ?? 0)

  // ponytail: in-JS month bucketing; move to SQL date_trunc if user volume grows.
  const monthLabels: string[] = []
  const monthKeys: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthLabels.push(d.toLocaleString("en-US", { month: "short" }))
    monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`)
  }
  const signupBuckets = monthKeys.map(() => 0)
  for (const u of recentSignups) {
    const c = u.createdAt
    const key = `${c.getFullYear()}-${c.getMonth()}`
    const idx = monthKeys.indexOf(key)
    if (idx >= 0) signupBuckets[idx]++
  }

  // Tier distribution ordered by TIER_ORDER, unknown tiers appended.
  const tierCounts = new Map(tierGroups.map((g) => [g.membershipStatus, g._count as number]))
  const orderedTiers = [
    ...TIER_ORDER.filter((t) => tierCounts.has(t)),
    ...[...tierCounts.keys()].filter((t) => !TIER_ORDER.includes(t)),
  ]
  const tierMax = Math.max(1, ...tierCounts.values())

  return (
    <div>
      <PageHeader title="Analytics" description="Platform growth, engagement, and economy at a glance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total members" value={nf.format(totalUsers)} icon={<Users className="h-5 w-5" weight="duotone" />} accent="indigo" />
        <StatCard label="Verified" value={nf.format(verifiedUsers)} icon={<SealCheck className="h-5 w-5" weight="duotone" />} accent="emerald" />
        <StatCard label="Pending verification" value={nf.format(pendingVerification)} icon={<SealCheck className="h-5 w-5" weight="duotone" />} accent="amber" />
        <StatCard label="Posts" value={nf.format(postCount)} icon={<Note className="h-5 w-5" weight="duotone" />} accent="sky" />
        <StatCard label="Messages" value={nf.format(messageCount)} icon={<ChatCircle className="h-5 w-5" weight="duotone" />} accent="violet" />
        <StatCard label="Events" value={nf.format(eventCount)} icon={<CalendarBlank className="h-5 w-5" weight="duotone" />} accent="rose" />
        <StatCard label="Games played" value={nf.format(gamePlays)} icon={<GameController className="h-5 w-5" weight="duotone" />} accent="indigo" />
        <StatCard label="Karma issued" value={nf.format(karmaIssued)} icon={<Coins className="h-5 w-5" weight="duotone" />} accent="amber" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-[5px] border border-zinc-800 bg-[#111113] p-4 lg:col-span-2">
          <SectionHeader title="Sign-ups (last 12 months)" />
          {recentSignups.length ? (
            <BarChart data={signupBuckets} labels={monthLabels} color="#3b82f6" />
          ) : (
            <EmptyState title="No sign-ups yet" description="New member registrations will appear here." />
          )}
        </div>

        <div className="rounded-[5px] border border-zinc-800 bg-[#111113] p-4">
          <SectionHeader title="Membership tiers" />
          {orderedTiers.length ? (
            <div className="space-y-3">
              {orderedTiers.map((tier) => {
                const count = tierCounts.get(tier) ?? 0
                return (
                  <div key={tier}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="capitalize text-zinc-300">{tier}</span>
                      <span className="tabular-nums text-zinc-400">{nf.format(count)}</span>
                    </div>
                    <ProgressBar value={count} max={tierMax} color={TIER_COLOR[tier] ?? "#71717a"} />
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState title="No members" description="Tier breakdown will appear here." />
          )}
        </div>
      </div>

      <div className="mt-3 rounded-[5px] border border-zinc-800 bg-[#111113] p-4">
        <SectionHeader title="Content & economy" />
        <Table>
          <Thead>
            <Tr>
              <Th>Metric</Th>
              <Th>Count</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr><Td>Posts</Td><Td>{nf.format(postCount)}</Td></Tr>
            <Tr><Td>Comments</Td><Td>{nf.format(commentCount)}</Td></Tr>
            <Tr><Td>Businesses</Td><Td>{nf.format(businessCount)}</Td></Tr>
            <Tr><Td>Events</Td><Td>{nf.format(eventCount)}</Td></Tr>
            <Tr><Td>Messages</Td><Td>{nf.format(messageCount)}</Td></Tr>
            <Tr><Td>Games played</Td><Td>{nf.format(gamePlays)}</Td></Tr>
            <Tr><Td>Karma redemptions</Td><Td className="inline-flex items-center gap-1"><Gift className="h-3.5 w-3.5" weight="duotone" />{nf.format(redemptions)}</Td></Tr>
            <Tr><Td>Karma issued</Td><Td>{nf.format(karmaIssued)}</Td></Tr>
          </Tbody>
        </Table>
      </div>
    </div>
  )
}
