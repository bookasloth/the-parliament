import { prisma } from "@/lib/prisma"
import AdminUsersClient, { MOCK_USERS, type AdminUser } from "./users-client"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const [rows, total, verified, pending, suspended] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
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
            house: { select: { name: true, colorHex: true } },
            batch: { select: { label: true } },
          },
        },
        userKarma: { select: { karmaBalance: true } },
      },
    }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isVerified: true } }),
    prisma.user.count({ where: { deletedAt: null, verificationStatus: "pending" } }),
    prisma.user.count({ where: { deletedAt: null, status: "suspended" } }),
  ])

  const mappedReal: AdminUser[] = rows.map((u) => ({
    id: u.id,
    name: u.displayName || u.legalName,
    email: u.email,
    username: u.username || "",
    batch: u.profile?.batch?.label ?? "—",
    house: u.profile?.house?.name ?? "—",
    houseColor: u.profile?.house?.colorHex ?? "#94a3b8",
    membership: u.membershipStatus,
    status:
      u.status === "suspended"
        ? "suspended"
        : u.verificationStatus === "pending"
          ? "pending"
          : "active",
    karma: Number(u.userKarma?.karmaBalance ?? 0),
    joined: u.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    lastActive: u.lastLoginAt ? u.lastLoginAt.toLocaleDateString() : "—",
  }))

  return (
    <AdminUsersClient
      users={[...mappedReal, ...MOCK_USERS]}
      stats={{ total, verified, pending, suspended }}
    />
  )
}
