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

  // Author scoping: hide blocked users; in "Following" mode restrict to the
  // people the viewer follows (+ self). Skipped on a single-author page.
  if (filters.viewerId && !filters.authorId) {
    const [blocks, follows] = await Promise.all([
      prisma.userBlock.findMany({
        where: { OR: [{ blockerId: filters.viewerId }, { blockedId: filters.viewerId }] },
        select: { blockerId: true, blockedId: true },
      }),
      filters.followingOnly
        ? prisma.follow.findMany({
            where: { followerId: filters.viewerId },
            select: { followingId: true },
          })
        : Promise.resolve(null),
    ])
    const blocked = new Set(
      blocks.map((b) => (b.blockerId === filters.viewerId ? b.blockedId : b.blockerId)),
    )
    if (follows) {
      // Following feed: allow followed authors + self, minus anyone blocked.
      const allowed = [...follows.map((f) => f.followingId), filters.viewerId].filter(
        (id) => !blocked.has(id),
      )
      where.authorId = { in: allowed }
    } else if (blocked.size > 0) {
      where.authorId = { notIn: [...blocked] }
    }
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
      profile: { select: { photoUrl: true, headline: true } },
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
            batch: { select: { id: true, label: true } },
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
