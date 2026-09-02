import { Suspense } from "react"
import { FeedContent, type ViewerCard, type SuggestedConnection, type NewsItem } from "./feed-content"
import type { FeedPost } from "@/components/shared/FeedCard"
import { getFeed } from "@/modules/feed/query"
import { canPinFeed } from "@/modules/feed/pin"
import { getActiveAnnouncement } from "@/modules/announcements/service"
import type { FeedCursor } from "@/modules/feed/cursor"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"
import { loadViewer } from "@/lib/viewer"
import { prisma } from "@/lib/prisma"
import { mapRowToFeedPost, relativeTime, batchOrdinal } from "./map-row"
import { injectFeedAds } from "@/config/feed-ads"
import { isPaidTier, type PlanCode } from "@/config/membership"
import { getFollowSuggestions } from "@/modules/onboarding/suggestions"
import { normalizeHashtag, postHashtagWhere } from "@/lib/rich-text"
import FeedLoading from "./loading"

export const dynamic = "force-dynamic"

const FIRST_PAGE_SIZE = 15

async function FeedData({ tab, pinnedNewId, tag }: { tab?: string; pinnedNewId?: string; tag?: string }) {
  const [schoolId, viewer] = await Promise.all([getDefaultSchoolId(), optionalUser()])
  // Tag view ignores the tab split (it's a cross-cutting filter).
  const hashtag = tag ? normalizeHashtag(tag) : undefined
  const followingOnly = !hashtag && tab === "following" && !!viewer?.id
  const trending = !hashtag && tab === "trending"

  let mappedReal: FeedPost[] = []
  let hasMore = false
  let nextCursor: FeedCursor | null = null
  let caughtUp = false
  let shuffleSeed: number | null = null
  const canPin = !!viewer && canPinFeed(viewer)
  let viewerCard: ViewerCard | null = null
  let suggestions: SuggestedConnection[] = []
  let news: NewsItem[] = []
  let eggedUsernames: string[] = []
  let tagCount = 0

  if (schoolId) {
    const [{ rows, caughtUp: cu, nextCursor: nc, shuffleSeed: seed }, u, [users, pinned]] = await Promise.all([
      getFeed({ schoolId, viewerId: viewer?.id, pageSize: FIRST_PAGE_SIZE, followingOnly, trending, hashtag, groupId: null }),
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

    const followingIds = viewer?.id
      ? new Set(
          (await prisma.follow.findMany({ where: { followerId: viewer.id }, select: { followingId: true } })).map(
            (f) => f.followingId,
          ),
        )
      : undefined
    // Tier for gating comes from the session claim (row truth via
    // resolveActivePlan) — never the denormalized u.membershipStatus column,
    // which can drift (suspended, expired, or legacy "free"). Paid tiers get the
    // full infinite feed; everyone else (student/free/inactive) gets the capped
    // teaser.
    const tier = (viewer?.membershipStatus ?? "student") as PlanCode
    const paid = isPaidTier(tier)
    mappedReal = injectFeedAds(rows.map((r) => mapRowToFeedPost(r, followingIds)), tier)

    if (pinnedNewId && viewer?.id) {
      const idx = mappedReal.findIndex((p) => p.id === pinnedNewId)
      if (idx > 0) {
        const [post] = mappedReal.splice(idx, 1)
        mappedReal.unshift(post)
      }
    }

    hasMore = paid ? rows.length === FIRST_PAGE_SIZE : false
    // Non-paying tiers can't load more, so no cursor is handed out.
    nextCursor = paid ? nc : null
    caughtUp = cu
    shuffleSeed = seed ?? null

    if (hashtag) {
      tagCount = await prisma.post.count({
        where: { schoolId, deletedAt: null, status: "visible", hashtags: postHashtagWhere(hashtag) },
      })
    }

    if (u) {
      const name = u.displayName || u.legalName
      viewerCard = {
        name,
        username: u.username ?? null,
        photoUrl:
          u.profile?.photoUrl ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        coverUrl: u.profile?.coverUrl ?? null,
        membership: tier,
        headline: u.profile?.headline ?? "",
        batch: batchOrdinal(u.profile?.batch?.startYear) ?? u.profile?.batch?.label ?? "—",
        house: u.profile?.house?.name ?? "—",
        posts: u._count.posts,
        followers: u._count.followers,
        following: u._count.following,
      }
    }

    // Ranked "people you may know" — house/batch/gender buckets w/ reason strings.
    if (viewer?.id) {
      suggestions = (await getFollowSuggestions(viewer.id)).map((s) => ({
        id: s.id,
        username: s.username,
        name: s.name,
        avatar: s.photoUrl,
        reason: s.reason,
      }))
    }
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

  const announcement = await getActiveAnnouncement()

  return (
    <FeedContent
      userName={viewerCard?.name ?? "Guest"}
      announcement={announcement}
      viewer={viewerCard}
      viewerId={viewer?.id ?? null}
      posts={mappedReal}
      initialHasMore={hasMore}
      initialCursor={nextCursor}
      pageSize={FIRST_PAGE_SIZE}
      suggestions={suggestions}
      news={news}
      initialEgged={eggedUsernames}
      loadedAt={new Date().toISOString()}
      activeTab={hashtag ? "forYou" : trending ? "trending" : followingOnly ? "following" : "forYou"}
      tag={hashtag ?? null}
      tagCount={tagCount}
      caughtUp={caughtUp}
      initialShuffleSeed={shuffleSeed}
      canPin={canPin}
    />
  )
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; new?: string; tag?: string }>
}) {
  const params = await searchParams

  // Key the boundary on tab+tag so a soft (client) navigation — e.g. clicking a
  // #hashtag — remounts it and streams the FeedLoading skeleton immediately.
  // Without the key, a searchParams-only nav reuses the boundary and shows no
  // feedback for the ~1–2s the RSC fetch takes, so the click felt dead.
  return (
    <Suspense key={`${params.tab ?? "forYou"}:${params.tag ?? ""}`} fallback={<FeedLoading />}>
      <FeedData tab={params.tab} pinnedNewId={params.new} tag={params.tag} />
    </Suspense>
  )
}
