import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { parsePage, pageCount, firstParam, PAGE_SIZE } from "@/modules/admin/pagination"
import AdminUsersClient, { type AdminUser } from "./users-client"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { page, skip, take } = parsePage(sp.page)
  const q = firstParam(sp.q)
  const house = firstParam(sp.house)
  const status = firstParam(sp.status) // active | pending | suspended
  const plan = firstParam(sp.plan)

  const where: Prisma.UserWhereInput = { deletedAt: null }
  if (q) {
    where.OR = [
      { legalName: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { username: { contains: q, mode: "insensitive" } },
    ]
  }
  if (house) where.profile = { house: { name: house } }
  if (plan) where.membershipStatus = plan
  // Derived status: "pending" = awaiting verification, "suspended" = suspended
  // account, "active" = everything else.
  if (status === "suspended") where.status = "suspended"
  else if (status === "pending") where.verificationStatus = "pending"
  else if (status === "active") {
    where.status = { not: "suspended" }
    where.verificationStatus = { not: "pending" }
  }

  const [rows, filteredTotal, total, verified, pending, suspended] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        username: true,
        legalName: true,
        displayName: true,
        email: true,
        membershipStatus: true,
        status: true,
        verificationStatus: true,
        createdAt: true,
        lastLoginAt: true,
        profile: {
          select: {
            houseId: true,
            batchId: true,
            house: { select: { name: true, colorHex: true } },
            batch: { select: { label: true } },
          },
        },
        userKarma: { select: { karmaBalance: true } },
        userBadges: { select: { badgeId: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isVerified: true } }),
    prisma.user.count({ where: { deletedAt: null, verificationStatus: "pending" } }),
    prisma.user.count({ where: { deletedAt: null, status: "suspended" } }),
  ])

  const [houseOpts, batchOpts, badgeOpts] = await Promise.all([
    prisma.house.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.batch.findMany({ orderBy: { startYear: "desc" }, select: { id: true, label: true } }),
    prisma.badge.findMany({ orderBy: { label: "asc" }, select: { id: true, label: true } }),
  ])

  const mappedReal: AdminUser[] = rows.map((u) => ({
    id: u.id,
    name: u.displayName || u.legalName,
    email: u.email,
    username: u.username || "",
    legalName: u.legalName,
    displayName: u.displayName ?? "",
    batch: u.profile?.batch?.label ?? "—",
    house: u.profile?.house?.name ?? "—",
    houseColor: u.profile?.house?.colorHex ?? "#94a3b8",
    houseId: u.profile?.houseId ?? "",
    batchId: u.profile?.batchId ?? "",
    membership: u.membershipStatus,
    status:
      u.status === "suspended"
        ? "suspended"
        : u.verificationStatus === "pending"
          ? "pending"
          : "active",
    karma: Number(u.userKarma?.karmaBalance ?? 0),
    badgeIds: u.userBadges.map((b) => b.badgeId),
    joined: u.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    lastActive: u.lastLoginAt ? u.lastLoginAt.toLocaleDateString() : "—",
  }))

  return (
    <AdminUsersClient
      users={mappedReal}
      stats={{ total, verified, pending, suspended }}
      query={{ page, q: q ?? "", house: house ?? "", status: status ?? "", plan: plan ?? "" }}
      pageInfo={{ page, pageCount: pageCount(filteredTotal), filteredTotal, pageSize: PAGE_SIZE }}
      houseOptions={houseOpts}
      batchOptions={batchOpts}
      badgeOptions={badgeOpts.map((b) => ({ id: b.id, label: b.label }))}
    />
  )
}
