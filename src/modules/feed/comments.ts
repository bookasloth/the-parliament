import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import { awardKarma } from "@/modules/karma/ledger"
import { KARMA } from "@/config/karma"

export type CommentReactionType = "upvote" | "downvote"

// Net-score delta for Comment.likeCount: upvote lifts, downvote sinks.
// ponytail: one column holds the net; split into up/down columns only if we
// ever need to display both counts separately.
function netDelta(type: CommentReactionType, sign: 1 | -1) {
  return { likeCount: { increment: (type === "upvote" ? 1 : -1) * sign } }
}

/**
 * Toggle a viewer's up/down vote on a comment. Mirrors toggleReaction (posts):
 * reuses the polymorphic Reaction row (entityType="comment"), keeps
 * Comment.likeCount as the denormalized net score, and awards karma like a post
 * like/downvote. Returns the viewer's resulting reaction (or null if cleared).
 */
export async function toggleCommentReaction(input: {
  userId: string
  commentId: string
  type: CommentReactionType
}) {
  const comment = await prisma.comment.findFirst({
    where: { id: input.commentId, deletedAt: null },
    select: { id: true, authorId: true },
  })
  if (!comment) throw new ForbiddenError("Comment not found")

  const existing = await prisma.reaction.findUnique({
    where: {
      userId_entityType_entityId: {
        userId: input.userId,
        entityType: "comment",
        entityId: input.commentId,
      },
    },
  })

  let reacted: CommentReactionType | null = input.type

  if (existing && existing.type === input.type) {
    // Same vote tapped again → clear it.
    await prisma.$transaction([
      prisma.reaction.delete({ where: { id: existing.id } }),
      prisma.comment.update({
        where: { id: input.commentId },
        data: netDelta(input.type, -1),
      }),
    ])
    reacted = null
  } else if (existing) {
    // Switch vote (up↔down): undo old, apply new.
    await prisma.$transaction([
      prisma.reaction.update({ where: { id: existing.id }, data: { type: input.type } }),
      prisma.comment.update({
        where: { id: input.commentId },
        data: {
          likeCount: {
            increment:
              (existing.type === "upvote" ? -1 : 1) + (input.type === "upvote" ? 1 : -1),
          },
        },
      }),
    ])
  } else {
    await prisma.$transaction([
      prisma.reaction.create({
        data: {
          userId: input.userId,
          entityType: "comment",
          entityId: input.commentId,
          type: input.type,
        },
      }),
      prisma.comment.update({
        where: { id: input.commentId },
        data: netDelta(input.type, 1),
      }),
    ])
  }

  // Karma only when adding/keeping a vote on someone else's comment.
  if (reacted && input.userId !== comment.authorId) {
    if (reacted === "upvote") {
      await awardKarma({
        userId: input.userId,
        actionType: "post_like_actor",
        baseValue: KARMA.CONTENT.LIKE.actor,
        counterpartyId: comment.authorId,
        role: "actor",
        entityType: "comment",
        entityId: comment.id,
      })
      await awardKarma({
        userId: comment.authorId,
        actionType: "post_like_publisher",
        baseValue: KARMA.CONTENT.LIKE.publisher,
        counterpartyId: input.userId,
        role: "publisher",
        entityType: "comment",
        entityId: comment.id,
      })
    } else {
      await awardKarma({
        userId: comment.authorId,
        actionType: "downvote_comment_publisher",
        baseValue: KARMA.CONTENT.DOWNVOTE_COMMENT.publisher,
        counterpartyId: input.userId,
        role: "publisher",
        entityType: "comment",
        entityId: comment.id,
      })
    }
  }

  return { reacted }
}

export interface MentionTarget {
  id: string
  username: string | null
  displayName: string
  avatarUrl: string
  headline: string | null
  isVerified: boolean
}

const mentionUserSelect = {
  id: true,
  username: true,
  displayName: true,
  legalName: true,
  isVerified: true,
  profile: { select: { photoUrl: true, headline: true } },
  _count: { select: { followers: true } },
} as const

function toMentionTarget(u: {
  id: string
  username: string | null
  displayName: string | null
  legalName: string
  isVerified: boolean
  profile: { photoUrl: string | null; headline: string | null } | null
}): MentionTarget {
  const name = u.displayName || u.legalName
  return {
    id: u.id,
    username: u.username,
    displayName: name,
    avatarUrl:
      u.profile?.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
    headline: u.profile?.headline ?? null,
    isVerified: u.isVerified,
  }
}

/**
 * Ranked @mention suggestions. Tiers, in order:
 *   1. People the viewer follows  — proxy for "most tagged by them".
 *      // ponytail: no @-mention history is stored yet; follow-graph is the
 *      // honest proxy. Swap to a real tag tally once mentions are tracked on write.
 *   2. Popular platform-wide      — highest follower count.
 *   3. Alphabetical               — remaining name matches, A–Z.
 * Deduped, viewer excluded, capped at `limit`, always ≥4 rows when enough users exist.
 */
export async function searchMentionTargets(
  viewerId: string,
  query: string,
  limit = 8,
): Promise<MentionTarget[]> {
  const q = query.trim().replace(/^@/, "")
  const nameFilter = q
    ? {
        OR: [
          { displayName: { contains: q, mode: "insensitive" as const } },
          { legalName: { contains: q, mode: "insensitive" as const } },
          { username: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {}
  const baseWhere = {
    id: { not: viewerId },
    status: "active",
    username: { not: null },
    ...nameFilter,
  }

  // Tier 1 — followed users (most-recently followed first — proxy for "tags most").
  const followed = await prisma.follow.findMany({
    where: { followerId: viewerId, following: baseWhere },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { following: { select: mentionUserSelect } },
  })
  const tier1 = followed.map((f) => toMentionTarget(f.following))

  const picked = new Set(tier1.map((t) => t.id))
  const results: MentionTarget[] = [...tier1]

  // Tier 2 — popular platform-wide (by follower count).
  if (results.length < limit) {
    const popular = await prisma.user.findMany({
      where: { ...baseWhere, id: { notIn: [viewerId, ...picked] } },
      orderBy: { followers: { _count: "desc" } },
      take: limit - results.length,
      select: mentionUserSelect,
    })
    for (const u of popular) {
      if (picked.has(u.id)) continue
      picked.add(u.id)
      results.push(toMentionTarget(u))
    }
  }

  // Tier 3 — alphabetical fill.
  if (results.length < limit) {
    const rest = await prisma.user.findMany({
      where: { ...baseWhere, id: { notIn: [viewerId, ...picked] } },
      orderBy: { displayName: "asc" },
      take: limit - results.length,
      select: mentionUserSelect,
    })
    for (const u of rest) {
      if (picked.has(u.id)) continue
      picked.add(u.id)
      results.push(toMentionTarget(u))
    }
  }

  return results.slice(0, limit)
}
