import { prisma } from "@/lib/prisma"
import AdminDashboardClient, {
  type RecentSignup,
  type NeedsAttentionRow,
  type AdminActivityRow,
  type TransactionRow,
} from "./dashboard-client"

export const dynamic = "force-dynamic"

function relativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function rupeesShort(paise: number): string {
  const r = paise / 100
  return r >= 1000 ? `Rs ${(r / 1000).toFixed(1)}k` : `Rs ${Math.round(r).toLocaleString("en-IN")}`
}

function rupeesExact(paise: number): string {
  return `Rs ${Math.round(paise / 100).toLocaleString("en-IN")}`
}

// Real delta vs a previous period. % when prior has volume, else raw +N. null when nothing to compare.
function pctDelta(cur: number, prev: number): { delta: string; deltaUp: boolean } | null {
  if (prev === 0) return cur > 0 ? { delta: `+${cur}`, deltaUp: true } : null
  const p = ((cur - prev) / prev) * 100
  return { delta: `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`, deltaUp: p >= 0 }
}

export default async function AdminDashboardPage() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  // last month-to-date: same elapsed window into the prior month
  const lastMonthToDateEnd = new Date(startOfLastMonth.getTime() + (now.getTime() - startOfMonth.getTime()))
  const growthStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    totalUsers,
    newThisWeek,
    newPriorWeek,
    pendingVerifications,
    openReports,
    upcomingEvents,
    membersSinceLastYear,
    revenueMtd,
    revenueLastMtd,
    dauRows,
    mauRows,
    growthUsers,
    weekPosts,
    signupRows,
    auditRows,
    txnRows,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.user.count({ where: { deletedAt: null, verificationStatus: "pending" } }),
    prisma.contentReport.count({ where: { status: "open" } }),
    prisma.event.count({ where: { startsAt: { gt: now } } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: yearAgo } } }),
    prisma.membership.aggregate({ _sum: { amountPaise: true }, where: { createdAt: { gte: startOfMonth } } }),
    prisma.membership.aggregate({
      _sum: { amountPaise: true },
      where: { createdAt: { gte: startOfLastMonth, lt: lastMonthToDateEnd } },
    }),
    // ponytail: distinct-scan for DAU/MAU; move to a rollup table if activity_events grows.
    prisma.activityEvent.findMany({
      where: { createdAt: { gte: dayAgo }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.activityEvent.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.user.findMany({
      where: { deletedAt: null, createdAt: { gte: growthStart } },
      select: { createdAt: true },
    }),
    prisma.post.findMany({
      where: { deletedAt: null, createdAt: { gte: weekAgo } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        legalName: true,
        displayName: true,
        email: true,
        createdAt: true,
        verificationStatus: true,
        status: true,
        profile: { select: { batch: { select: { label: true } } } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { actorId: true, action: true, entityType: true, createdAt: true },
    }),
    prisma.membership.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        planCode: true,
        amountPaise: true,
        status: true,
        createdAt: true,
        user: { select: { displayName: true, legalName: true } },
      },
    }),
  ])

  const revenueMtdPaise = revenueMtd._sum.amountPaise ?? 0
  const revenueLastMtdPaise = revenueLastMtd._sum.amountPaise ?? 0

  // Recent signups
  const recentSignups: RecentSignup[] = signupRows.map((u) => ({
    name: u.displayName || u.legalName,
    email: u.email,
    batch: u.profile?.batch?.label ?? "—",
    time: relativeTime(u.createdAt),
    status: u.status === "suspended" ? "suspended" : u.verificationStatus,
  }))

  // Needs Attention — only live, non-zero rows
  const needsAttention: NeedsAttentionRow[] = []
  if (pendingVerifications > 0)
    needsAttention.push({
      kind: "verification",
      label: `${pendingVerifications} verification request${pendingVerifications === 1 ? "" : "s"} awaiting review`,
      href: "/admin/verification",
    })
  if (openReports > 0)
    needsAttention.push({
      kind: "reports",
      label: `${openReports} content report${openReports === 1 ? "" : "s"} open`,
      href: "/admin/reports",
    })
  if (upcomingEvents > 0)
    needsAttention.push({
      kind: "events",
      label: `${upcomingEvents} upcoming event${upcomingEvents === 1 ? "" : "s"} scheduled`,
      href: "/admin/events",
    })

  // User growth — 12 monthly signup buckets, oldest → newest
  const growthBuckets = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short" }), count: 0 }
  })
  const growthIdx = new Map(growthBuckets.map((b, i) => [b.key, i]))
  for (const u of growthUsers) {
    const idx = growthIdx.get(`${u.createdAt.getFullYear()}-${u.createdAt.getMonth()}`)
    if (idx !== undefined) growthBuckets[idx].count++
  }

  // Posts this week — 7 daily buckets ending today
  const postBuckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - 6 + i)
    return { start: d.getTime(), label: d.toLocaleString("en-US", { weekday: "short" }), count: 0 }
  })
  for (const p of weekPosts) {
    const t = p.createdAt.getTime()
    for (let i = postBuckets.length - 1; i >= 0; i--) {
      if (t >= postBuckets[i].start) {
        postBuckets[i].count++
        break
      }
    }
  }

  // Admin activity — app-layer join actorId → name
  const actorIds = [...new Set(auditRows.map((a) => a.actorId).filter((x): x is string => !!x))]
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, displayName: true, legalName: true } })
    : []
  const actorMap = new Map(actors.map((a) => [a.id, a.displayName || a.legalName]))
  const adminActivity: AdminActivityRow[] = auditRows.map((a) => ({
    actor: (a.actorId && actorMap.get(a.actorId)) || "system",
    action: a.action.replace(/[_.]/g, " "),
    entityType: a.entityType ?? "",
    time: relativeTime(a.createdAt),
  }))

  // Recent transactions
  const transactions: TransactionRow[] = txnRows.map((t) => ({
    id: t.id.slice(0, 8),
    user: t.user.displayName || t.user.legalName,
    plan: t.planCode,
    amount: rupeesExact(t.amountPaise),
    status: t.status,
    time: relativeTime(t.createdAt),
  }))

  const newWeekDelta = pctDelta(newThisWeek, newPriorWeek)
  const revenueDelta = pctDelta(revenueMtdPaise, revenueLastMtdPaise)

  return (
    <AdminDashboardClient
      totalUsers={totalUsers}
      newThisWeek={newThisWeek}
      newWeekDelta={newWeekDelta?.delta}
      newWeekDeltaUp={newWeekDelta?.deltaUp}
      pendingVerifications={pendingVerifications}
      openReports={openReports}
      revenueMtd={rupeesShort(revenueMtdPaise)}
      revenueDelta={revenueDelta?.delta}
      revenueDeltaUp={revenueDelta?.deltaUp}
      upcomingEvents={upcomingEvents}
      dau={dauRows.length}
      mau={mauRows.length}
      userGrowth={growthBuckets.map((b) => b.count)}
      userGrowthLabels={growthBuckets.map((b) => b.label)}
      membersSinceLastYear={membersSinceLastYear}
      postsWeek={postBuckets.map((b) => b.count)}
      postsWeekLabels={postBuckets.map((b) => b.label)}
      postsWeekTotal={weekPosts.length}
      needsAttention={needsAttention}
      recentSignups={recentSignups}
      adminActivity={adminActivity}
      transactions={transactions}
    />
  )
}
