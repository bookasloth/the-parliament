import { Suspense } from "react"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"
import { searchDirectory, getDirectoryFacets, type DirectoryFilters } from "@/modules/directory/service"
import { getFollowingIds } from "@/modules/connections/service"
import { CommunityClient } from "./community-client"
import { getSidebarViewer } from "@/components/shared/ProfileSidebar"
import Loading from "./loading"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 24

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

async function CommunityData({ sp }: { sp: Record<string, string | undefined> }) {
  const schoolId = (await getDefaultSchoolId()) ?? undefined
  const me = await optionalUser()

  const [{ rows, total }, facets, { totalActive, verifiedCount }] = await Promise.all([
    getDirectoryCached({
      schoolId,
      viewerId: me?.id,
      q: sp.q || undefined,
      batchId: sp.batch || undefined,
      houseId: sp.house || undefined,
      membershipStatus: sp.membership || undefined,
      city: sp.city || undefined,
      industry: sp.industry || undefined,
      verifiedOnly: sp.verified === "1",
      sort: (sp.sort as DirectoryFilters["sort"]) || undefined,
    }),
    getFacetsCached(schoolId),
    getCountsCached(schoolId),
  ])

  const [followingIds, sidebarViewer] = await Promise.all([
    me ? getFollowingIds(me.id).then((s) => Array.from(s)) : Promise.resolve([]),
    getSidebarViewer(),
  ])

  return (
    <CommunityClient
      rows={rows}
      total={total}
      facets={facets}
      current={sp}
      meId={me?.id ?? null}
      stats={{ totalActive, verifiedCount, batches: facets.batches.length, industries: facets.industries.length }}
      followingIds={followingIds}
      sidebarViewer={sidebarViewer}
    />
  )
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams

  return (
    <Suspense fallback={<Loading />}>
      <CommunityData sp={sp} />
    </Suspense>
  )
}
