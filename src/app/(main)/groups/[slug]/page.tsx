import { notFound } from "next/navigation"
import { optionalUser } from "@/modules/auth/session"
import { getGroupPageData, getGroupFeed } from "@/modules/groups/service"
import { prisma } from "@/lib/prisma"
import { colorAvatar } from "@/lib/avatar"
import { mapRowToFeedPost } from "@/app/(main)/feed/map-row"
import type { FeedPost } from "@/components/shared/FeedCard"
import GroupDetailClient from "./group-detail-client"
import { GroupFeed } from "./group-feed"

export const dynamic = "force-dynamic"

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await optionalUser()

  let data
  try {
    data = await getGroupPageData(slug, user?.id ?? null)
  } catch {
    notFound()
  }
  if (!data) notFound()

  // Group discussion feed (audit P1-6). Membership-gated inside getGroupFeed.
  let initialPosts: FeedPost[] = []
  let viewer: { id: string; displayName: string; avatarUrl: string } | null = null
  if (user?.id) {
    const [feed, me, following] = await Promise.all([
      getGroupFeed(slug, user.id).catch(() => null),
      prisma.user.findUnique({ where: { id: user.id }, select: { displayName: true, legalName: true, profile: { select: { photoUrl: true } } } }),
      prisma.follow.findMany({ where: { followerId: user.id }, select: { followingId: true } }),
    ])
    if (feed) {
      const followingIds = new Set(following.map((f) => f.followingId))
      initialPosts = feed.rows.map((r) => mapRowToFeedPost(r, followingIds))
    }
    if (me) {
      viewer = {
        id: user.id,
        displayName: me.displayName || me.legalName,
        avatarUrl: me.profile?.photoUrl || colorAvatar(user.id),
      }
    }
  }

  return (
    <>
      <GroupDetailClient data={data} loggedIn={!!user} />
      {(data.canSeeAll || data.isJoined) && (
        <div className="bg-[#f3f2ef]">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 pb-10">
            <div className="max-w-2xl">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Discussion</h2>
              <GroupFeed
                groupId={data.id}
                canPost={data.isJoined}
                viewerId={user?.id ?? null}
                viewer={viewer}
                initialPosts={initialPosts}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
