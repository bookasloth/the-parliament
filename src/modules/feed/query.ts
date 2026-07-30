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

  // Hide posts by anyone the viewer has blocked, or who has blocked the viewer.
  // Skipped when viewing a specific author's page (filters.authorId already set).
  if (filters.viewerId && !filters.authorId) {
    const blocks = await prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: filters.viewerId }, { blockedId: filters.viewerId }],
      },
      select: { blockerId: true, blockedId: true },
    })
    const blockedUserIds = blocks.map((b) =>
      b.blockerId === filters.viewerId ? b.blockedId : b.blockerId,
    )
    if (blockedUserIds.length > 0) where.authorId = { notIn: blockedUserIds }
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

export interface PostCommentRow {
  id: string
  body: string
  likeCount: number
  createdAt: Date
  author: {
    id: string
    username: string | null
    displayName: string
    legalName: string
    isVerified: boolean
    profile: { photoUrl: string | null; headline: string | null } | null
  }
}

export async function listPostComments(postId: string, limit = 100): Promise<PostCommentRow[]> {
  const rows = await prisma.comment.findMany({
    where: { postId, deletedAt: null, parentId: null },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      body: true,
      likeCount: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          legalName: true,
          isVerified: true,
          profile: { select: { photoUrl: true, headline: true } },
        },
      },
    },
  })
  return rows
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
