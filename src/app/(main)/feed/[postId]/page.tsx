import { notFound } from "next/navigation"
import { optionalUser } from "@/modules/auth/session"
import { getPostById } from "@/modules/feed/query"
import { prisma } from "@/lib/prisma"
import { mapRowToFeedPost } from "../map-row"
import PostCard from "./post-card"
import { AdRail } from "@/components/shared/AdRail"
import { ProfileSidebar } from "@/components/shared/ProfileSidebar"
import { SIDEBAR_NAV } from "@/config/sidebar-nav"

export const dynamic = "force-dynamic"

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params
  const viewer = await optionalUser()

  const result = await getPostById(postId, viewer?.id).catch(() => null)
  if (!result) notFound()
  const { post, viewerReaction } = result

  // Count the view once per (viewer, post) via the same impressions table the
  // feed uses — refreshes / author re-opens no longer inflate viewCount, and a
  // detail open now also counts toward feed reach. Anonymous views aren't
  // counted (the feed observer is logged-in only too, so this stays symmetric).
  if (viewer?.id) {
    const { count } = await prisma.postImpression.createMany({
      data: [{ userId: viewer.id, postId: post.id }],
      skipDuplicates: true,
    })
    if (count > 0) {
      await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})
    }
  }

  const isAuthor = viewer?.id === post.author.id
  const followingIds =
    viewer?.id && !isAuthor
      ? new Set(
          (await prisma.follow.findMany({ where: { followerId: viewer.id, followingId: post.author.id }, select: { followingId: true } })).map(
            (f) => f.followingId,
          ),
        )
      : undefined
  const feedPost = mapRowToFeedPost({ ...post, viewerReaction }, followingIds, viewer?.id)

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      {/* Same 3-column shell as the main feed: sticky profile rail on the left,
          reading column (max-w-3xl measure) in the middle, display-ad rail on
          the right (renders nothing for ad-free tiers). */}
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="hidden lg:block w-full lg:w-[280px] flex-shrink-0">
          <div className="sticky top-20">
            <ProfileSidebar nav={SIDEBAR_NAV.feed} />
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <div className="max-w-3xl">
            <PostCard post={feedPost} isAuthor={isAuthor} initialSaved={feedPost.savedByViewer ?? false} />
          </div>
        </div>
        <AdRail set="seoAi" />
      </div>
    </div>
  )
}
