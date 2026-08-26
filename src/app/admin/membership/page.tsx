import { requirePermission } from "@/lib/gate"
import { prisma } from "@/lib/prisma"
import { getMembershipStats } from "@/modules/membership/admin"
import MembershipClient, { type TxRow, type PlanRow } from "./membership-client"

export const dynamic = "force-dynamic"

const PLAN_LABEL: Record<string, string> = {
  student: "Student", associate: "Associate", premium: "Premium",
  life: "Life Member", committee: "Committee", inactive: "Inactive",
}

export default async function AdminMembershipPage() {
  await requirePermission("membership:manage")

  const [stats, orders] = await Promise.all([
    getMembershipStats(),
    prisma.membershipOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { legalName: true, displayName: true, username: true, email: true } } },
    }),
  ])

  const transactions: TxRow[] = orders.map((o) => ({
    id: o.id,
    user: o.user.legalName || o.user.displayName || o.user.username || o.user.email,
    email: o.user.email,
    plan: PLAN_LABEL[o.planCode] ?? o.planCode,
    amountInr: Math.round(o.amountPaise / 100),
    status: o.status,
    date: o.createdAt.toISOString(),
    refundable: !!o.razorpayPaymentId && o.status !== "refunded",
  }))

  const totalPlans = Object.values(stats.byPlan).reduce((a, n) => a + n, 0) || 1
  const plans: PlanRow[] = Object.entries(stats.byPlan).map(([code, count]) => ({
    plan: PLAN_LABEL[code] ?? code,
    count,
    pct: Math.round((count / totalPlans) * 100),
  })).sort((a, b) => b.count - a.count)

  return (
    <MembershipClient
      transactions={transactions}
      plans={plans}
      stats={{
        totalActive: stats.totalActive,
        mrrInr: stats.mrrInr,
        lifetimeInr: stats.lifetimeContributionInr,
        expiring30d: stats.expiringIn30Days,
      }}
    />
  )
}
