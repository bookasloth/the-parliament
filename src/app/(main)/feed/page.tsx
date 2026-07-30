import { FeedContent, type ViewerCard, type SuggestedConnection, type NewsItem } from "./feed-content"
import type { FeedPost } from "@/components/shared/FeedCard"
import { getFeed } from "@/modules/feed/query"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { mapRowToFeedPost, relativeTime } from "./map-row"

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
  if (schoolId) {
    const { rows } = await getFeed({
      schoolId,
      viewerId: viewer?.id,
      pageSize: FIRST_PAGE_SIZE,
      followingOnly,
    })
    mappedReal = rows.map(mapRowToFeedPost)
    hasMore = rows.length === FIRST_PAGE_SIZE
  }

  let viewerCard: ViewerCard | null = null
  if (viewer?.id) {
    const u = await prisma.user.findUnique({
      where: { id: viewer.id },
      select: {
        displayName: true,
        legalName: true,
        profile: {
          select: {
            photoUrl: true,
            headline: true,
            batch: { select: { label: true } },
            house: { select: { name: true } },
          },
        },
      },
    })
    if (u) {
      const name = u.displayName || u.legalName
      viewerCard = {
        name,
        photoUrl:
          u.profile?.photoUrl ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        headline: u.profile?.headline ?? "",
        batch: u.profile?.batch?.label ?? "—",
        house: u.profile?.house?.name ?? "—",
      }
    }
  }

  let suggestions: SuggestedConnection[] = []
  let news: NewsItem[] = []
  let eggedUsernames: string[] = []
  if (schoolId) {
    const [users, pinned] = await Promise.all([
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
    ])
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
    />
  )
}
