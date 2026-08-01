import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"
import { searchDirectory, getDirectoryFacets, type DirectoryFilters } from "@/modules/directory/service"
import { getFollowingIds } from "@/modules/connections/service"
import { CommunityClient } from "./community-client"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 24

// Directory data is shared across viewers (only the follow-state overlay is
// per-viewer, fetched separately below). Cache it, keyed by the filter args.
// Short window on the result set, longer on facets/counts (they drift slowly);
// tagged "directory" so profile/verification changes can revalidateTag it.
const getDirectoryCached = unstable_cache(
  (filters: DirectoryFilters) => searchDirectory(filters, { page: 1, pageSize: PAGE_SIZE }),
  ["community-directory"],
  { tags: ["directory"], revalidate: 60 },
)
const getFacetsCached = unstable_cache(
  (schoolId?: string) => getDirectoryFacets(schoolId),
  ["community-facets"],
  { tags: ["directory"], revalidate: 300 },
)
const getCountsCached = unstable_cache(
  async (schoolId?: string) => {
    const base = { status: "active" as const, deletedAt: null, ...(schoolId ? { schoolId } : {}) }
    const [totalActive, verifiedCount] = await Promise.all([
      prisma.user.count({ where: base }),
      prisma.user.count({ where: { ...base, isVerified: true } }),
    ])
    return { totalActive, verifiedCount }
  },
  ["community-counts"],
  { tags: ["directory"], revalidate: 300 },
)

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const schoolId = (await getDefaultSchoolId()) ?? undefined
  const me = await optionalUser()
  // Server always renders the first page; the client lazy-loads the rest.

  const [{ rows, total }, facets, { totalActive, verifiedCount }] = await Promise.all([
    getDirectoryCached({
      schoolId,
      q: sp.q || undefined,
      batchId: sp.batch || undefined,
      houseId: sp.house || undefined,
      membershipStatus: sp.membership || undefined,
      city: sp.city || undefined,
      verifiedOnly: sp.verified === "1",
    }),
    getFacetsCached(schoolId),
    getCountsCached(schoolId),
  ])

  const followingIds = me ? Array.from(await getFollowingIds(me.id)) : []

  return (
    <CommunityClient
      rows={rows}
      total={total}
      facets={facets}
      current={sp}
      meId={me?.id ?? null}
      stats={{ totalActive, verifiedCount, batches: facets.batches.length }}
      followingIds={followingIds}
    />
  )
}
