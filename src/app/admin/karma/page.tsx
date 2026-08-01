import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { thresholdFor } from "@/modules/karma/ledger"
import { relativeTime } from "@/lib/relative-time"
import KarmaClient, { type Earner, type Adjustment } from "./karma-client"

export const dynamic = "force-dynamic"

export default async function AdminKarmaPage() {
  await requireAdmin()

  const since30d = new Date(Date.now() - 30 * 86400_000)
  const [earnersRaw, mentorCount, avg, issued, adjRaw] = await Promise.all([
    prisma.userKarma.findMany({
      orderBy: { lifetimeEarned: "desc" },
      take: 5,
      include: { user: { select: { legalName: true, displayName: true, username: true } } },
    }),
    prisma.userKarma.count({ where: { karmaBalance: { gte: 500 } } }),
    prisma.userKarma.aggregate({ _avg: { karmaBalance: true } }),
    prisma.karmaTransaction.aggregate({
      _sum: { appliedValue: true },
      where: { appliedValue: { gt: 0 }, createdAt: { gte: since30d } },
    }),
    prisma.karmaTransaction.findMany({
      where: { actionType: "admin_adjustment" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { legalName: true, displayName: true, username: true } } },
    }),
  ])

  const earners: Earner[] = earnersRaw.map((e) => {
    const bal = e.karmaBalance.toNumber()
    return {
      name: e.user.legalName || e.user.displayName || e.user.username || "—",
      karma: Math.round(e.lifetimeEarned.toNumber()),
      level: thresholdFor(bal).level.replace("_", " "),
    }
  })

  const adjustments: Adjustment[] = adjRaw.map((a) => ({
    user: a.user.legalName || a.user.displayName || a.user.username || "—",
    change: a.appliedValue.toNumber(),
    reason: a.reasonCode ?? "—",
    time: relativeTime(a.createdAt),
  }))

  return (
    <KarmaClient
      stats={{
        issued30d: Math.round(issued._sum.appliedValue?.toNumber() ?? 0),
        avgKarma: Math.round(avg._avg.karmaBalance?.toNumber() ?? 0),
        mentorCount,
      }}
      earners={earners}
      adjustments={adjustments}
    />
  )
}
