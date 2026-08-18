import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { parsePage, pageCount, firstParam, PAGE_SIZE } from "@/modules/admin/pagination"
import BusinessesClient, { type BusinessRow } from "./businesses-client"

export const dynamic = "force-dynamic"

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const sp = await searchParams
  const { page, skip, take } = parsePage(sp.page)
  const q = firstParam(sp.q)
  const status = firstParam(sp.status)
  const category = firstParam(sp.category)

  const where: Prisma.BusinessWhereInput = {}
  if (status) where.status = status as Prisma.BusinessWhereInput["status"]
  if (category) where.categoryId = category
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ]
  }

  const [businesses, filteredTotal, total, pending, approved, suspended, categories] =
    await Promise.all([
      prisma.business.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          owner: { select: { legalName: true, displayName: true, username: true } },
          category: { select: { label: true } },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.business.count({ where }),
      prisma.business.count(),
      prisma.business.count({ where: { status: "pending" } }),
      prisma.business.count({ where: { status: "approved" } }),
      prisma.business.count({ where: { status: "suspended" } }),
      prisma.businessCategory.findMany({ orderBy: { label: "asc" }, select: { id: true, label: true } }),
    ])

  const rows: BusinessRow[] = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    city: b.city,
    owner: b.owner.displayName || b.owner.legalName,
    category: b.category.label,
    status: b.status,
    ratingAvg: Number(b.ratingAvg),
    ratingCount: b.ratingCount,
    reviewCount: b._count.reviews,
    createdAt: b.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  }))

  return (
    <BusinessesClient
      rows={rows}
      categories={categories}
      stats={{ total, pending, approved, suspended }}
      query={{ page, q: q ?? "", status: status ?? "", category: category ?? "" }}
      pageInfo={{ page, pageCount: pageCount(filteredTotal), filteredTotal, pageSize: PAGE_SIZE }}
    />
  )
}
