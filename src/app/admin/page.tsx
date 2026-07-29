import { prisma } from "@/lib/prisma"
import AdminDashboardClient, { MOCK_RECENT_SIGNUPS, type RecentSignup } from "./dashboard-client"

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

export default async function AdminDashboardPage() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [totalUsers, newThisWeek, pendingApprovals, signupRows] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { deletedAt: null, verificationStatus: "pending" } }),
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
  ])

  const mappedSignups: RecentSignup[] = signupRows.map((u) => ({
    name: u.displayName || u.legalName,
    email: u.email,
    batch: u.profile?.batch?.label ?? "—",
    time: relativeTime(u.createdAt),
    status: u.status === "suspended" ? "suspended" : u.verificationStatus,
  }))

  const recentSignups = mappedSignups.length > 0 ? mappedSignups : MOCK_RECENT_SIGNUPS

  return (
    <AdminDashboardClient
      totalUsers={totalUsers}
      newThisWeek={newThisWeek}
      pendingApprovals={pendingApprovals}
      recentSignups={recentSignups}
    />
  )
}
