import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { parsePage, pageCount, firstParam, PAGE_SIZE } from "@/modules/admin/pagination"
import RewardsClient, { type RewardItemRow, type RedemptionRow } from "./rewards-client"

export const dynamic = "force-dynamic"

const STATUSES = ["fulfilled", "pending", "refunded", "cancelled"] as const

export default async function AdminRewardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const sp = await searchParams
  const { page, skip, take } = parsePage(sp.page)
  const statusParam = firstParam(sp.status)
  const status = STATUSES.includes(statusParam as (typeof STATUSES)[number])
    ? (statusParam as (typeof STATUSES)[number])
    : undefined

  const where: Prisma.KarmaRedemptionWhereInput = {}
  if (status) where.status = status

  const [items, redemptions, filteredTotal, totalItems, activeItems, totalRedemptions, pendingRedemptions, spentAgg] =
    await Promise.all([
      prisma.rewardItem.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          category: true,
          karmaCost: true,
          quantity: true,
          deliveryType: true,
          isActive: true,
          isFeatured: true,
          popularity: true,
          _count: { select: { redemptions: true } },
        },
      }),
      prisma.karmaRedemption.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          karmaSpent: true,
          status: true,
          deliveryChannel: true,
          createdAt: true,
          user: { select: { displayName: true, legalName: true, username: true } },
          rewardItem: { select: { title: true } },
        },
      }),
      prisma.karmaRedemption.count({ where }),
      prisma.rewardItem.count(),
      prisma.rewardItem.count({ where: { isActive: true } }),
      prisma.karmaRedemption.count(),
      prisma.karmaRedemption.count({ where: { status: "pending" } }),
      prisma.karmaRedemption.aggregate({ _sum: { karmaSpent: true } }),
    ])

  const itemRows: RewardItemRow[] = items.map((i) => ({
    id: i.id,
    title: i.title,
    category: i.category,
    karmaCost: Number(i.karmaCost),
    quantity: i.quantity,
    deliveryType: i.deliveryType,
    isActive: i.isActive,
    isFeatured: i.isFeatured,
    popularity: i.popularity,
    redemptions: i._count.redemptions,
  }))

  const redemptionRows: RedemptionRow[] = redemptions.map((r) => ({
    id: r.id,
    user: r.user.displayName || r.user.legalName || r.user.username || "—",
    reward: r.rewardItem.title,
    karmaSpent: Number(r.karmaSpent),
    status: r.status,
    channel: r.deliveryChannel,
    date: r.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  }))

  return (
    <RewardsClient
      items={itemRows}
      redemptions={redemptionRows}
      stats={{
        totalItems,
        activeItems,
        totalRedemptions,
        pendingRedemptions,
        karmaSpent: Number(spentAgg._sum.karmaSpent ?? 0),
      }}
      query={{ page, status: status ?? "" }}
      pageInfo={{ page, pageCount: pageCount(filteredTotal), filteredTotal, pageSize: PAGE_SIZE }}
    />
  )
}
