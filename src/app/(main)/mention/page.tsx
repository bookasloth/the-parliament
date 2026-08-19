import { Suspense } from "react"
import { FeedContent, type ViewerCard } from "@/app/(main)/feed/feed-content"
import type { FeedPost } from "@/components/shared/FeedCard"
import { getFeed } from "@/modules/feed/query"
import { canPinFeed } from "@/modules/feed/pin"
import { getActiveAnnouncement } from "@/modules/announcements/service"
import { getDefaultSchoolId } from "@/lib/school"
import { requireUser } from "@/modules/auth/session"
import { loadViewer } from "@/lib/viewer"
import { prisma } from "@/lib/prisma"
import { mapRowToFeedPost, batchOrdinal } from "@/app/(main)/feed/map-row"
import FeedLoading from "@/app/(main)/feed/loading"

export const dynamic = "force-dynamic"
export const metadata = { title: "Mentions · The Parliament" }

const PAGE_SIZE = 15

async function MentionData() {
  const [schoolId, viewer] = await Promise.all([getDefaultSchoolId(), requireUser()])

  const profile = await prisma.profile.findUnique({
    where: { userId: viewer.id },
    select: { houseId: true, batchId: true },
  })

  let posts: FeedPost[] = []
  let hasMore = false
  let nextCursor = null
  let viewerCard: ViewerCard | null = null

  if (schoolId) {
    const [{ rows, nextCursor: nc }, u, followRows] = await Promise.all([
      getFeed({
        schoolId,
        viewerId: viewer.id,
        pageSize: PAGE_SIZE,
        mentionsUserId: viewer.id,
        mentionsHouseId: profile?.houseId ?? undefined,
        mentionsBatchId: profile?.batchId ?? undefined,
      }),
      loadViewer(viewer.id),
      prisma.follow.findMany({ where: { followerId: viewer.id }, select: { followingId: true } }),
    ])

    const followingIds = new Set(followRows.map((f) => f.followingId))
    posts = rows.map((r) => mapRowToFeedPost(r, followingIds))
    hasMore = rows.length === PAGE_SIZE
    nextCursor = nc

    if (u) {
      const name = u.displayName || u.legalName
      viewerCard = {
        name,
        username: u.username ?? null,
        photoUrl: u.profile?.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        coverUrl: u.profile?.coverUrl ?? null,
        membership: u.membershipStatus,
        headline: u.profile?.headline ?? "",
        batch: batchOrdinal(u.profile?.batch?.startYear) ?? u.profile?.batch?.label ?? "—",
        house: u.profile?.house?.name ?? "—",
        posts: u._count.posts,
        followers: u._count.followers,
        following: u._count.following,
      }
    }
  }

  const announcement = await getActiveAnnouncement()

  return (
    <FeedContent
      userName={viewerCard?.name ?? "Guest"}
      announcement={announcement}
      viewer={viewerCard}
      viewerId={viewer.id}
      posts={posts}
      initialHasMore={hasMore}
      initialCursor={nextCursor}
      pageSize={PAGE_SIZE}
      loadedAt={new Date().toISOString()}
      canPin={!!viewerCard && canPinFeed(viewer)}
      mentions
    />
  )
}

export default function MentionPage() {
  return (
    <Suspense fallback={<FeedLoading />}>
      <MentionData />
    </Suspense>
  )
}
