import { FeedContent, type ViewerCard, type SuggestedConnection, type NewsItem } from "./feed-content"
import type { FeedPost } from "@/components/shared/FeedCard"
import { getFeed } from "@/modules/feed/query"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"
import { loadViewer } from "@/lib/viewer"
import { prisma } from "@/lib/prisma"
import { mapRowToFeedPost, relativeTime, batchOrdinal } from "./map-row"
import { injectFeedAds } from "@/config/feed-ads"

export const dynamic = "force-dynamic"

const FIRST_PAGE_SIZE = 15

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ tab }, [schoolId, viewer]] = await Promise.all([
    searchParams,
    Promise.all([getDefaultSchoolId(), optionalUser()]),
  ])
  const followingOnly = tab === "following" && !!viewer?.id

  let mappedReal: FeedPost[] = []
  let hasMore = false
  let caughtUp = false
  let viewerCard: ViewerCard | null = null
  let suggestions: SuggestedConnection[] = []
  let news: NewsItem[] = []
  let eggedUsernames: string[] = []

  if (schoolId) {
    // These three are mutually independent (feed, the viewer's own card, and
    // the sidebar rails) — one round-trip group instead of three sequential
    // awaits. The egg overlay below depends on `users`, so it stays a second hop.
    const [{ rows, caughtUp: cu }, u, [users, pinned]] = await Promise.all([
      getFeed({ schoolId, viewerId: viewer?.id, pageSize: FIRST_PAGE_SIZE, followingOnly }),
      viewer?.id ? loadViewer(viewer.id) : Promise.resolve(null),
      Promise.all([
        prisma.user.findMany({
          where: {
            schoolId,
            status: "active",
            ...(viewer?.id ? { id: { not: viewer.id } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            username: true,
            displayName: true,
            legalName: true,
            profile: {
              select: {
                photoUrl: true,
                headline: true,
                city: true,
              },
            },
          },
        }),
        prisma.post.findMany({
          where: { schoolId, isPinned: true, status: "visible" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, body: true, createdAt: true },
        }),
      ]),
    ])

    // Which of the feed's authors the viewer already follows — so posts open in
    // the correct follow state and stay in sync via the shared follow store.
    const followingIds = viewer?.id
      ? new Set(
          (await prisma.follow.findMany({ where: { followerId: viewer.id }, select: { followingId: true } })).map(
            (f) => f.followingId,
          ),
        )
      : undefined
    const tier = u?.membershipStatus ?? "student"
    mappedReal = injectFeedAds(rows.map((r) => mapRowToFeedPost(r, followingIds)), tier)
    // Students get a capped 5-item feed — no "load more".
    hasMore = tier === "student" ? false : rows.length === FIRST_PAGE_SIZE
    caughtUp = cu

    if (u) {
      const name = u.displayName || u.legalName
      viewerCard = {
        name,
        username: u.username ?? null,
        photoUrl:
          u.profile?.photoUrl ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
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

    suggestions = users.map((u) => {
      const name = u.displayName || u.legalName
      return {
        username: u.username ?? "",
        name,
        role: u.profile?.headline || u.profile?.city || "JNV Nagpur Alumni",
        avatar:
          u.profile?.photoUrl ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      }
    })
    news = pinned.map((p) => ({
      id: p.id,
      title: (p.body ?? "Pinned post").slice(0, 80),
      time: relativeTime(p.createdAt),
    }))
    if (viewer?.id && users.length > 0) {
      const idToUsername = new Map(users.map((u) => [u.id, u.username ?? ""]))
      const thrown = await prisma.notification.findMany({
        where: {
          userId: { in: users.map((u) => u.id) },
          type: "poke",
          entityType: "user",
          entityId: viewer.id,
        },
        select: { userId: true },
      })
      eggedUsernames = thrown.map((n) => idToUsername.get(n.userId) ?? "").filter(Boolean)
    }
  }

  return (
    <FeedContent
      userName={viewerCard?.name ?? "Guest"}
      viewer={viewerCard}
      viewerId={viewer?.id ?? null}
      posts={mappedReal}
      initialHasMore={hasMore}
      pageSize={FIRST_PAGE_SIZE}
      suggestions={suggestions}
      news={news}
      initialEgged={eggedUsernames}
      loadedAt={new Date().toISOString()}
      activeTab={followingOnly ? "following" : "forYou"}
      caughtUp={caughtUp}
    />
  )
}
