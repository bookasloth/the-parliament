import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { blockedIdsFor } from "@/modules/connections/blocks"

export interface DirectoryFilters {
  q?: string
  batchId?: string
  houseId?: string
  divisionId?: string
  city?: string
  profession?: string
  industry?: string
  memberType?: string
  membershipStatus?: string
  verifiedOnly?: boolean
  schoolId?: string
  sort?: "active" | "newest" | "name"
  /** The signed-in viewer. Drives privacy: `private` profiles are never listed,
   *  `connections` profiles only to connected viewers, and blocked users are
   *  excluded both ways. Omit for a logged-out call (public profiles only). */
  viewerId?: string
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
  industry: string | null
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
  if (filters.membershipStatus) where.membershipStatus = filters.membershipStatus
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
  if (filters.industry) profileFilters.industry = filters.industry

  if (Object.keys(profileFilters).length > 0) {
    where.profile = { is: profileFilters }
  }

  if (filters.divisionId) {
    where.userDivisions = { some: { divisionId: filters.divisionId } }
  }

  // ── Privacy gate (audit P0-8) ──────────────────────────────────────────────
  // The directory used to ignore Profile.visibility, listing "Private" members
  // with full name/employer/city. Enforce it here, plus symmetric block exclusion.
  const viewerId = filters.viewerId
  const allowedVis: ("public" | "alumni")[] = viewerId ? ["public", "alumni"] : ["public"]
  const [blocked, connectedIds] = viewerId
    ? await Promise.all([
        blockedIdsFor(viewerId),
        prisma.follow
          .findMany({
            where: { OR: [{ followerId: viewerId }, { followingId: viewerId }] },
            select: { followerId: true, followingId: true },
          })
          .then((rows) => {
            const s = new Set<string>()
            for (const r of rows) s.add(r.followerId === viewerId ? r.followingId : r.followerId)
            return s
          }),
      ])
    : [new Set<string>(), new Set<string>()]

  const andClauses: Prisma.UserWhereInput[] = [
    {
      OR: [
        { profile: { is: { visibility: { in: allowedVis } } } },
        // Profiles with no Profile row default to `alumni` — visible to members.
        ...(viewerId ? [{ profile: { is: null } } as Prisma.UserWhereInput] : []),
        // `connections`-scoped profiles only to a connected viewer.
        ...(connectedIds.size > 0
          ? [{ id: { in: [...connectedIds] }, profile: { is: { visibility: "connections" as const } } }]
          : []),
        // The viewer always sees their own row.
        ...(viewerId ? [{ id: viewerId }] : []),
      ],
    },
  ]
  if (blocked.size > 0) andClauses.push({ id: { notIn: [...blocked] } })
  where.AND = andClauses

  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    filters.sort === "newest"
      ? [{ createdAt: "desc" }]
      : filters.sort === "name"
        ? [{ legalName: "asc" }]
        : // "active" (default): verified first, then most recently seen.
          [{ isVerified: "desc" }, { lastLoginAt: "desc" }, { createdAt: "desc" }]

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
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
            industry: true,
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
      industry: r.profile?.industry ?? null,
      company: r.profile?.company ?? null,
      headline: r.profile?.headline ?? null,
      photoUrl: r.profile?.photoUrl ?? null,
      batch: r.profile?.batch ?? null,
      house: r.profile?.house ?? null,
    })),
    total,
  }
}

// Facets (batch/house/division lists) are near-static. NOT cached here — the
// community page already wraps this in unstable_cache under the shared "directory"
// tag, so a second inner cache would shadow revalidateTag("directory") and serve
// stale facets. Keep this a plain query; the caller owns caching + invalidation.
export async function getDirectoryFacets(schoolId?: string) {
  const where = schoolId ? { schoolId } : {}
  const activeUserWhere = { status: "active" as const, deletedAt: null, ...(schoolId ? { schoolId } : {}) }
  const [batches, houses, divisions, industryGroups, cityGroups] = await Promise.all([
    prisma.batch.findMany({ where, orderBy: { startYear: "desc" }, select: { id: true, label: true, startYear: true } }),
    // system + gender let the profile-edit house picker scope options to the
    // member's batch era + gender (see @/config/houses).
    prisma.house.findMany({ where, orderBy: [{ system: "asc" }, { name: "asc" }], select: { id: true, name: true, colorHex: true, system: true, gender: true } }),
    prisma.division.findMany({ where, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    // Distinct industries among active, non-deleted members (for the industry filter + stat).
    prisma.profile.groupBy({
      by: ["industry"],
      where: { industry: { not: null }, user: activeUserWhere },
      _count: { industry: true },
      orderBy: { _count: { industry: "desc" } },
    }),
    // Distinct cities (for the profile-edit city autocomplete).
    prisma.profile.groupBy({
      by: ["city"],
      where: { city: { not: null }, user: activeUserWhere },
      _count: { city: true },
      orderBy: { _count: { city: "desc" } },
      take: 200,
    }),
  ])
  const industries = industryGroups
    .map((g) => ({ name: (g.industry ?? "").trim(), count: g._count.industry }))
    .filter((g) => g.name.length > 0)
  const cities = cityGroups
    .map((g) => (g.city ?? "").trim())
    .filter((c) => c.length > 0)
  return { batches, houses, divisions, industries, cities }
}
