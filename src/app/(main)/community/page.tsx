import { prisma } from "@/lib/prisma"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"
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
  const me = await optionalUser()
  // Server always renders the first page; the client lazy-loads the rest.

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
      { page: 1, pageSize: PAGE_SIZE },
    ),
    getDirectoryFacets(schoolId),
    prisma.user.count({ where: { status: "active", deletedAt: null, ...(schoolId ? { schoolId } : {}) } }),
    prisma.user.count({ where: { status: "active", deletedAt: null, isVerified: true, ...(schoolId ? { schoolId } : {}) } }),
  ])

  return (
    <CommunityClient
      rows={rows}
      total={total}
      facets={facets}
      current={sp}
      meId={me?.id ?? null}
      stats={{ totalActive, verifiedCount, batches: facets.batches.length }}
    />
  )
}
