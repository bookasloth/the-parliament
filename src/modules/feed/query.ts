import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { planExclusions, shouldServeCaughtUp, planCaughtUpOrder, CAUGHT_UP_POOL, SEEN_EXCLUSION_WINDOW } from "./impressions"
import { recencyCursorWhere, rankedCursorWhere, isRankedCursor, type FeedCursor } from "./cursor"
import { organizeCommentThread } from "./comment-thread"
import { trendingWindowStart } from "./trending"
import { postHashtagWhere } from "@/lib/rich-text"

export { recencyCursorWhere, rankedCursorWhere, type FeedCursor } from "./cursor"

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
  /** "Trending" feed: rankingScore desc, windowed to the last 48h ("hot now"). */
  trending?: boolean
  /** Restrict to posts carrying this hashtag (case-insensitive). */
  hashtag?: string
  /**
   * Keyset pagination cursor — the last row of the previous page. Honoured on
   * BOTH feeds: recency keys on (createdAt, id), ranked on (rankingScore, id).
   * Paging by value (not offset) prevents dup/skip drift — on recency when posts
   * are inserted mid-scroll, on ranked when rankingScore is recomputed mid-scroll.
   * Not used for the caught-up backfill (page-1 only), which stays offset-based.
   */
  cursor?: FeedCursor
  /** Skip seen-post exclusion (hidden posts are still excluded). Used for
   *  load-more when page 1 was served in caught-up mode. */
  skipSeenExclusion?: boolean
  /** Force the caught-up recycle path (used by load-more once page 1 was caught
   *  up) instead of re-detecting it — page ≥ 2 never auto-detects. */
  caughtUp?: boolean
  /** Seed for the caught-up shuffle. Page 1 mints one; load-more passes it back
   *  so a visit's pages share one order. A fresh visit → fresh seed → reshuffle. */
  shuffleSeed?: number
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
  if (filters.trending) where.createdAt = { gte: trendingWindowStart() }
  if (filters.hashtag) where.hashtags = postHashtagWhere(filters.hashtag)

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
  // Ids the viewer has already seen — excluded so the feed never repeats.
  // Kept separate from the hidden set because the "caught up" fallback re-runs
  // with only hidden excluded (seen posts may resurface, hidden never do).
  let hiddenIds: string[] = []
  let seenIds: string[] = []
  if (filters.viewerId && !filters.authorId) {
    const viewerId = filters.viewerId
    const [blocks, follows, hidden, seen] = await Promise.all([
      prisma.userBlock.findMany({
        where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
        select: { blockerId: true, blockedId: true },
      }),
      prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
      prisma.hiddenPost.findMany({ where: { userId: viewerId }, select: { postId: true } }),
      prisma.postImpression.findMany({
        where: { userId: viewerId },
        orderBy: { seenAt: "desc" },
        take: SEEN_EXCLUSION_WINDOW,
        select: { postId: true },
      }),
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

    // "not interested" (hidden) never resurface; recently-seen posts are excluded
    // so each visit surfaces fresh content.
    hiddenIds = hidden.map((h) => h.postId)
    seenIds = seen.map((s) => s.postId)
    const excludeIds = filters.skipSeenExclusion
      ? hiddenIds
      : planExclusions(hiddenIds, seenIds)
    if (excludeIds.length > 0) where.id = { notIn: excludeIds }

    // Followers-scoped posts are visible only to the author's followers (or self).
    // ponytail: "groups" scope treated as public here; group-feed enforcement lives
    // in the groups module.
    where.OR = [
      { visibilityScope: { not: "followers" } },
      { authorId: { in: [...followingSet, viewerId] } },
    ]
  }

  // Both feeds keyset-paginate over a TOTAL order so pages never dup/skip:
  //   recency → (createdAt, id) DESC
  //   ranked  → (rankingScore, id) DESC  (id tie-break; drops createdAt tiebreak)
  // isPinned floats pinned posts to the top of page 1 ONLY — on cursor pages we
  // exclude pinned entirely (below) so a low-scored pinned post can't re-inject
  // itself on every later page (the duplicate the score-mutation drift caused).
  const isRecency = filters.rankerName === "recency"
  const usesCursor = !!filters.cursor
  const isTrending = !!filters.trending
  // Trending drops the isPinned float (pinning is a "for you" concept) and sorts
  // purely by hot score within the recent window — offset paginated (no cursor).
  // Ranked default keys on (rankingScore, id) so page 1 (offset) and later cursor
  // pages share one total order — the tiebreak must match rankedCursorWhere.
  const orderBy: Prisma.PostOrderByWithRelationInput[] = isRecency
    ? [{ createdAt: "desc" }, { id: "desc" }]
    : isTrending
      ? [{ rankingScore: "desc" }, { createdAt: "desc" }, { id: "desc" }]
      : usesCursor
        ? [{ rankingScore: "desc" }, { id: "desc" }]
        : [{ isPinned: "desc" }, { rankingScore: "desc" }, { id: "desc" }]

  if (usesCursor) {
    const keyset =
      isRankedCursor(filters.cursor!) && !isRecency
        ? rankedCursorWhere(filters.cursor!)
        : recencyCursorWhere(filters.cursor as { createdAt: string; id: string })
    where.AND = Array.isArray(where.AND)
      ? [...where.AND, keyset]
      : where.AND
        ? [where.AND, keyset]
        : [keyset]
    // Pinned posts belong to page 1's top; never re-serve them on cursor pages.
    if (!isRecency) where.isPinned = false
  }

  let rows = await prisma.post.findMany({
    where,
    orderBy,
    ...(usesCursor ? {} : { skip: (page - 1) * pageSize }),
    take: pageSize,
    select: postSelect(filters.viewerId),
  })

  // "Caught up": the viewer has seen everything on page 1. Recycle recent posts
  // (hidden/blocked still enforced) so the feed is never blank — but shuffled,
  // unseen-first, and re-seeded each visit so every return shows something
  // different. Load-more forces this path (filters.caughtUp) since page ≥ 2
  // never auto-detects.
  let caughtUp = filters.caughtUp ?? false
  let shuffleSeed = filters.shuffleSeed
  if (
    !usesCursor &&
    (caughtUp || shouldServeCaughtUp({ page, unseenRowCount: rows.length, seenCount: seenIds.length, pageSize }))
  ) {
    caughtUp = true
    shuffleSeed = shuffleSeed ?? Math.floor(Math.random() * 0x7fffffff)
    where.id = hiddenIds.length > 0 ? { notIn: hiddenIds } : undefined
    const pool = await prisma.post.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: CAUGHT_UP_POOL,
      select: { id: true },
    })
    const ordered = planCaughtUpOrder(pool.map((p) => p.id), seenIds, shuffleSeed)
    const slice = ordered.slice((page - 1) * pageSize, page * pageSize)
    const byId = slice.length
      ? new Map(
          (
            await prisma.post.findMany({ where: { id: { in: slice } }, select: postSelect(filters.viewerId) })
          ).map((r) => [r.id, r]),
        )
      : new Map()
    rows = slice.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r)
  }

  // Affinity: on the "For You" feed, float posts by followed authors up within
  // the page (stable — keeps hot-score order inside each group). ponytail: an
  // in-page boost; a full cross-page windowed re-rank is a later refinement.
  if (!caughtUp && !filters.followingOnly && !isTrending && filters.rankerName !== "recency" && followingSet.size > 0) {
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

  // Keyset cursor for the next page — only when a full page came back (a short
  // page means we hit the end → no cursor) and NOT in caught-up mode (that path
  // stays offset-based). Callers pass it straight back as `cursor` to fetch the
  // next page with no dup/skip drift. Ranked keys on (rankingScore, id); recency
  // on (createdAt, id).
  const last = rows[rows.length - 1]
  const nextCursor: FeedCursor | null =
    !caughtUp && !isTrending && last && rows.length === pageSize
      ? isRecency
        ? { createdAt: last.createdAt.toISOString(), id: last.id }
        : // rankingScore is a Prisma Decimal — coerce to a plain number so the
          // cursor survives the server-action serialization boundary. Decimal(10,3)
          // fits a JS number exactly.
          { rankingScore: Number(last.rankingScore), id: last.id }
      : null

  return {
    rows: rows.map((r) => ({
      ...r,
      viewerReaction: viewerReactionByPostId.get(r.id) ?? null,
    })),
    page,
    pageSize,
    rankerUsed: filters.rankerName === "recency" ? "recency" : "ranking",
    caughtUp,
    nextCursor,
    shuffleSeed,
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
  imageUrl: true,
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
/** A reply carries the true target's @handle when it replied to another reply. */
type ReplyEnriched = CommentEnriched & { replyingTo: string | null }
export type PostCommentRow = CommentEnriched & { replies: ReplyEnriched[] }

// Top-level comments (oldest first) each with their replies, flattened to one
// visual level. Replies store their TRUE parentId, so a reply-to-a-reply is
// walked up to its top-level ancestor for display and surfaces "replying to
// @handle" for its real target (see organizeCommentThread). `viewerId` attaches
// the viewer's own up/down vote per comment (for optimistic UI).
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
  // All replies on the post (not just direct children of top) so reply-to-reply
  // chains resolve to their ancestor instead of vanishing.
  const replies = top.length
    ? await prisma.comment.findMany({
        where: { postId, deletedAt: null, parentId: { not: null } },
        orderBy: { createdAt: "asc" },
        select: commentSelect,
      })
    : []

  const handleOf = (c: CommentBase): string | null =>
    c.author.username ?? c.author.displayName ?? c.author.legalName ?? null
  const { repliesByRoot } = organizeCommentThread([...top, ...replies], handleOf)

  // One lookup for the viewer's votes across every comment on this post.
  const allIds = [...top, ...replies].map((c) => c.id)
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
    replies: (repliesByRoot.get(t.id) ?? []).map(({ comment, replyingTo }) => ({
      ...enrich(comment),
      replyingTo,
    })),
  }))
}

function postSelect(viewerId?: string) {
  return {
    id: true,
    format: true,
    body: true,
    media: true,
    linkUrl: true,
    linkPreview: true,
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
    viewCount: true,
    qualityScore: true,
    reportPenalty: true,
    rankingScore: true, // ranked keyset cursor tie-break value
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
