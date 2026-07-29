import { prisma } from "@/lib/prisma"
import { getDefaultSchoolId } from "@/lib/school"
import { searchDirectory, getDirectoryFacets } from "@/modules/directory/service"
import { CommunityClient } from "./community-client"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 24

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const schoolId = (await getDefaultSchoolId()) ?? undefined
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1)

  const [{ rows, total }, facets, totalActive, verifiedCount] = await Promise.all([
    searchDirectory(
      {
        schoolId,
        q: sp.q || undefined,
        batchId: sp.batch || undefined,
        houseId: sp.house || undefined,
        membershipStatus: sp.membership || undefined,
        city: sp.city || undefined,
        verifiedOnly: sp.verified === "1",
      },
      { page, pageSize: PAGE_SIZE },
    ),
    getDirectoryFacets(schoolId),
    prisma.user.count({ where: { status: "active", deletedAt: null, ...(schoolId ? { schoolId } : {}) } }),
    prisma.user.count({ where: { status: "active", deletedAt: null, isVerified: true, ...(schoolId ? { schoolId } : {}) } }),
  ])

  return (
    <CommunityClient
      rows={rows}
      total={total}
      page={page}
      pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      facets={facets}
      current={sp}
      stats={{ totalActive, verifiedCount, batches: facets.batches.length }}
    />
  )
}
