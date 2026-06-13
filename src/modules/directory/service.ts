import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export interface DirectoryFilters {
  q?: string
  batchId?: string
  houseId?: string
  divisionId?: string
  city?: string
  profession?: string
  memberType?: string
  verifiedOnly?: boolean
  schoolId?: string
}

export interface DirectoryPage {
  page: number
  pageSize: number
}

export interface DirectoryRow {
  id: string
  username: string | null
  legalName: string
  displayName: string
  isVerified: boolean
  membershipStatus: string
  city: string | null
  profession: string | null
  company: string | null
  headline: string | null
  photoUrl: string | null
  batch: { id: string; label: string } | null
  house: { id: string; name: string; colorHex: string } | null
}

export async function searchDirectory(
  filters: DirectoryFilters,
  page: DirectoryPage = { page: 1, pageSize: 24 },
): Promise<{ rows: DirectoryRow[]; total: number }> {
  const where: Prisma.UserWhereInput = {
    status: "active",
    deletedAt: null,
  }
  if (filters.schoolId) where.schoolId = filters.schoolId
  if (filters.memberType) where.memberType = filters.memberType
  if (filters.verifiedOnly) where.isVerified = true

  if (filters.q) {
    where.OR = [
      { legalName: { contains: filters.q, mode: "insensitive" } },
      { displayName: { contains: filters.q, mode: "insensitive" } },
      { username: { contains: filters.q, mode: "insensitive" } },
    ]
  }

  const profileFilters: Prisma.ProfileWhereInput = {}
  if (filters.batchId) profileFilters.batchId = filters.batchId
  if (filters.houseId) profileFilters.houseId = filters.houseId
  if (filters.city) profileFilters.city = { contains: filters.city, mode: "insensitive" }
  if (filters.profession) profileFilters.profession = { contains: filters.profession, mode: "insensitive" }

  if (Object.keys(profileFilters).length > 0) {
    where.profile = { is: profileFilters }
  }

  if (filters.divisionId) {
    where.userDivisions = { some: { divisionId: filters.divisionId } }
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ isVerified: "desc" }, { lastLoginAt: "desc" }, { createdAt: "desc" }],
      skip: (page.page - 1) * page.pageSize,
      take: page.pageSize,
      select: {
        id: true,
        username: true,
        legalName: true,
        displayName: true,
        isVerified: true,
        membershipStatus: true,
        profile: {
          select: {
            city: true,
            profession: true,
            company: true,
            headline: true,
            photoUrl: true,
            batch: { select: { id: true, label: true } },
            house: { select: { id: true, name: true, colorHex: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    rows: rows.map((r) => ({
      id: r.id,
      username: r.username,
      legalName: r.legalName,
      displayName: r.displayName,
      isVerified: r.isVerified,
      membershipStatus: r.membershipStatus,
      city: r.profile?.city ?? null,
      profession: r.profile?.profession ?? null,
      company: r.profile?.company ?? null,
      headline: r.profile?.headline ?? null,
      photoUrl: r.profile?.photoUrl ?? null,
      batch: r.profile?.batch ?? null,
      house: r.profile?.house ?? null,
    })),
    total,
  }
}

export async function getDirectoryFacets(schoolId?: string) {
  const where = schoolId ? { schoolId } : {}
  const [batches, houses, divisions] = await Promise.all([
    prisma.batch.findMany({ where, orderBy: { startYear: "desc" }, select: { id: true, label: true } }),
    prisma.house.findMany({ where, orderBy: { name: "asc" }, select: { id: true, name: true, colorHex: true } }),
    prisma.division.findMany({ where, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])
  return { batches, houses, divisions }
}
