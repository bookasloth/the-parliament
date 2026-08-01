import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export interface FeedFilters {
  schoolId: string
  categoryKey?: string
  batchId?: string
  houseId?: string
  format?: "text" | "image" | "link" | "quote" | "poll" | "question"
  authorId?: string
  groupId?: string | null
  rankerName?: string
  page?: number
  pageSize?: number
  viewerId?: string
  /** "Following" feed: only posts from users the viewer follows (+ their own). */
  followingOnly?: boolean
}

export async function getFeed(filters: FeedFilters) {
  const page = filters.page ?? 1
  const pageSize = Math.min(filters.pageSize ?? 20, 50)

  const where: Prisma.PostWhereInput = {
    schoolId: filters.schoolId,
    deletedAt: null,
    status: "visible",
  }

  if (filters.format) where.format = filters.format
  if (filters.authorId) where.authorId = filters.authorId
  if (filters.groupId !== undefined) where.groupId = filters.groupId

  if (filters.categoryKey) {
    const cat = await prisma.postCategory.findUnique({
      where: { schoolId_key: { schoolId: filters.schoolId, key: filters.categoryKey } },
      select: { id: true },
    })
    if (cat) where.categoryId = cat.id
  }

  if (filters.batchId || filters.houseId) {
    where.author = {
      is: {
        profile: {
          is: {
            ...(filters.batchId ? { batchId: filters.batchId } : {}),
            ...(filters.houseId ? { houseId: filters.houseId } : {}),
          },
        },
      },
    }
  }

  // Per-viewer scoping (skipped on a single-author page): blocks, follow graph,
  // hidden posts, and "followers"-visibility enforcement.
  const followingSet = new Set<string>()
  if (filters.viewerId && !filters.authorId) {
    const viewerId = filters.viewerId
    const [blocks, follows, hidden] = await Promise.all([
      prisma.userBlock.findMany({
        where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
        select: { blockerId: true, blockedId: true },
      }),
      prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
      prisma.hiddenPost.findMany({ where: { userId: viewerId }, select: { postId: true } }),
    ])
    const blocked = new Set(
      blocks.map((b) => (b.blockerId === viewerId ? b.blockedId : b.blockerId)),
    )
    for (const f of follows) followingSet.add(f.followingId)

    if (filters.followingOnly) {
      const allowed = [...followingSet, viewerId].filter((id) => !blocked.has(id))
      where.authorId = { in: allowed }
    } else if (blocked.size > 0) {
      where.authorId = { notIn: [...blocked] }
    }

    // "not interested" — never resurface hidden posts.
    const hiddenIds = hidden.map((h) => h.postId)
    if (hiddenIds.length > 0) where.id = { notIn: hiddenIds }

    // Followers-scoped posts are visible only to the author's followers (or self).
    // ponytail: "groups" scope treated as public here; group-feed enforcement lives
    // in the groups module.
    where.OR = [
      { visibilityScope: { not: "followers" } },
      { authorId: { in: [...followingSet, viewerId] } },
    ]
  }

  // Order by the stored hot score (indexed) — real DB pagination over every
  // candidate, not an in-memory re-rank of a recency window. "recency" ranker
  // falls back to createdAt.
  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    filters.rankerName === "recency"
      ? [{ isPinned: "desc" }, { createdAt: "desc" }]
      : [{ isPinned: "desc" }, { rankingScore: "desc" }, { createdAt: "desc" }]

  const rows = await prisma.post.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: postSelect(filters.viewerId),
  })

  // Affinity: on the "For You" feed, float posts by followed authors up within
  // the page (stable — keeps hot-score order inside each group). ponytail: an
  // in-page boost; a full cross-page windowed re-rank is a later refinement.
  if (!filters.followingOnly && filters.rankerName !== "recency" && followingSet.size > 0) {
    rows.sort((a, b) => {
      const ap = a.isPinned ? 1 : 0
      const bp = b.isPinned ? 1 : 0
      if (ap !== bp) return bp - ap
      const af = followingSet.has(a.author.id) ? 1 : 0
      const bf = followingSet.has(b.author.id) ? 1 : 0
      return bf - af
    })
  }

  // Reactions live in a polymorphic table — fetch viewer's rows in one shot.
  let viewerReactionByPostId = new Map<string, string>()
  if (filters.viewerId && rows.length > 0) {
    const rx = await prisma.reaction.findMany({
      where: {
        userId: filters.viewerId,
        entityType: "post",
        entityId: { in: rows.map((c) => c.id) },
      },
      select: { entityId: true, type: true },
    })
    viewerReactionByPostId = new Map(rx.map((r) => [r.entityId, r.type]))
  }

  return {
    rows: rows.map((r) => ({
      ...r,
      viewerReaction: viewerReactionByPostId.get(r.id) ?? null,
    })),
    page,
    pageSize,
    rankerUsed: filters.rankerName === "recency" ? "recency" : "ranking",
  }
}

/** Posts the viewer has saved (newest first), shaped like getFeed rows. */
export async function listSavedPosts(viewerId: string, limit = 30) {
  const saved = await prisma.savedPost.findMany({
    where: { userId: viewerId, post: { deletedAt: null, status: "visible" } },
    orderBy: { savedAt: "desc" },
    take: limit,
    select: { post: { select: postSelect(viewerId) } },
  })
  const rows = saved.map((s) => s.post)
  let viewerReactionByPostId = new Map<string, string>()
  if (rows.length > 0) {
    const rx = await prisma.reaction.findMany({
      where: { userId: viewerId, entityType: "post", entityId: { in: rows.map((r) => r.id) } },
      select: { entityId: true, type: true },
    })
    viewerReactionByPostId = new Map(rx.map((r) => [r.entityId, r.type]))
  }
  return rows.map((r) => ({ ...r, viewerReaction: viewerReactionByPostId.get(r.id) ?? null }))
}

/** Fetch a single post + author + viewer reaction, or null. Excludes deleted. */
export async function getPostById(id: string, viewerId?: string) {
  const post = await prisma.post.findFirst({
    where: { id, deletedAt: null, status: "visible" },
    select: postSelect(viewerId),
  })
  if (!post) return null

  const viewerReaction = viewerId
    ? await prisma.reaction.findUnique({
        where: {
          userId_entityType_entityId: {
            userId: viewerId,
            entityType: "post",
            entityId: id,
          },
        },
        select: { type: true },
      })
    : null

  return { post, viewerReaction: viewerReaction?.type ?? null }
}

const commentSelect = {
  id: true,
  body: true,
  likeCount: true,
  createdAt: true,
  parentId: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      legalName: true,
      isVerified: true,
      membershipStatus: true,
      profile: {
        select: {
          photoUrl: true,
          headline: true,
          batch: { select: { label: true, startYear: true, endYear: true } },
        },
      },
    },
  },
} satisfies Prisma.CommentSelect

type CommentBase = Prisma.CommentGetPayload<{ select: typeof commentSelect }>
type CommentEnriched = CommentBase & { myReaction: "upvote" | "downvote" | null }
export type PostCommentRow = CommentEnriched & { replies: CommentEnriched[] }

// Top-level comments (oldest first) each with their direct replies. One level of
// nesting — replies to replies are stored against the same top-level parent.
// `viewerId` attaches the viewer's own up/down vote per comment (for optimistic UI).
export async function listPostComments(
  postId: string,
  limit = 100,
  viewerId?: string,
): Promise<PostCommentRow[]> {
  const top = await prisma.comment.findMany({
    where: { postId, deletedAt: null, parentId: null },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: commentSelect,
  })
  const topIds = top.map((t) => t.id)
  const replies = topIds.length
    ? await prisma.comment.findMany({
        where: { postId, deletedAt: null, parentId: { in: topIds } },
        orderBy: { createdAt: "asc" },
        select: commentSelect,
      })
    : []

  // One lookup for the viewer's votes across every comment on this post.
  const allIds = [...topIds, ...replies.map((r) => r.id)]
  const myVotes = new Map<string, "upvote" | "downvote">()
  if (viewerId && allIds.length) {
    const rx = await prisma.reaction.findMany({
      where: { userId: viewerId, entityType: "comment", entityId: { in: allIds } },
      select: { entityId: true, type: true },
    })
    for (const r of rx) myVotes.set(r.entityId, r.type as "upvote" | "downvote")
  }
  const enrich = (c: CommentBase): CommentEnriched => ({
    ...c,
    myReaction: myVotes.get(c.id) ?? null,
  })

  return top.map((t) => ({
    ...enrich(t),
    replies: replies.filter((r) => r.parentId === t.id).map(enrich),
  }))
}

function postSelect(viewerId?: string) {
  return {
    id: true,
    format: true,
    body: true,
    media: true,
    linkUrl: true,
    quoteSource: true,
    isAnonymous: true,
    textBg: true,
    visibilityScope: true,
    isPinned: true,
    isEdited: true,
    editedAt: true,
    upvoteCount: true,
    downvoteCount: true,
    commentCount: true,
    shareCount: true,
    qualityScore: true,
    reportPenalty: true,
    createdAt: true,
    category: { select: { key: true, label: true } },
    poll: {
      select: {
        id: true,
        question: true,
        expiresAt: true,
        totalVotes: true,
        options: {
          select: { id: true, label: true, voteCount: true },
          orderBy: { sortOrder: "asc" as const },
        },
        ...(viewerId
          ? { votes: { where: { userId: viewerId }, select: { optionId: true }, take: 1 } }
          : {}),
      },
    },
    author: {
      select: {
        id: true,
        username: true,
        legalName: true,
        displayName: true,
        isVerified: true,
        membershipStatus: true,
        profile: {
          select: {
            photoUrl: true,
            headline: true,
            house: { select: { id: true, name: true, colorHex: true } },
            batch: { select: { id: true, label: true, startYear: true, endYear: true } },
          },
        },
      },
    },
    ...(viewerId
      ? {
          savedBy: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
        }
      : {}),
  } satisfies Prisma.PostSelect
}
