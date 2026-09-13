import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import { awardKarma } from "@/modules/karma/ledger"
import { sendNotification } from "@/modules/notifications/service"
import { KARMA } from "@/config/karma"
import { enqueueBadgeEval } from "@/modules/badges/enqueue"

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
    select: { id: true, authorId: true, postId: true },
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
      // Notify the comment author their comment was upvoted (audit P1-3 — comment
      // reactions notified nobody). In-app only; coalesced by the 6h window.
      const actor = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { displayName: true, legalName: true },
      })
      const fromName = actor?.displayName || actor?.legalName || "Someone"
      await sendNotification({
        userId: comment.authorId,
        kind: "reaction_on_comment",
        title: `${fromName} liked your comment`,
        entityType: "post",
        entityId: comment.postId,
        sendEmail: false,
      }).catch(() => {})
    } else {
      await awardKarma({
        userId: input.userId,
        actionType: "downvote_comment_actor",
        baseValue: KARMA.CONTENT.DOWNVOTE_COMMENT.actor,
        counterpartyId: comment.authorId,
        role: "actor",
        entityType: "comment",
        entityId: comment.id,
      })
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

  if (reacted === "upvote") {
    void enqueueBadgeEval(input.userId) // reactor → First Upvote
    if (input.userId !== comment.authorId) void enqueueBadgeEval(comment.authorId) // Commentator ladder
  }
  return { reacted }
}

export interface MentionTarget {
  id: string
  username: string | null
  displayName: string
  avatarUrl: string
  headline: string | null
  batchLabel: string | null
  isVerified: boolean
}

const mentionUserSelect = {
  id: true,
  username: true,
  displayName: true,
  legalName: true,
  isVerified: true,
  profile: { select: { photoUrl: true, headline: true, batch: { select: { label: true, startYear: true } } } },
} as const

function toMentionTarget(u: {
  id: string
  username: string | null
  displayName: string | null
  legalName: string
  isVerified: boolean
  profile: { photoUrl: string | null; headline: string | null; batch: { label: string | null; startYear: number | null } | null } | null
}): MentionTarget {
  const name = u.displayName || u.legalName
  const b = u.profile?.batch
  const batchLabel = b ? (b.label || (b.startYear ? `${b.startYear} Batch` : null)) : null
  return {
    id: u.id,
    username: u.username,
    displayName: name,
    avatarUrl:
      u.profile?.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
    headline: u.profile?.headline ?? null,
    batchLabel,
    isVerified: u.isVerified,
  }
}

/**
 * Ranked @mention suggestions. Tiers, in order:
 *   1. Recently tagged   — people the viewer @mentioned before, newest first.
 *   2. Batchmates        — same batch as the viewer, A–Z.
 *   3. Housemates        — same house as the viewer, A–Z.
 *   4. Alphabetical      — everyone else, A–Z.
 * Deduped, viewer excluded, capped at `limit`. Empty query returns the same
 * ranking (so typing just "@" surfaces sensible people immediately).
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
    status: "active" as const,
    memberType: { notIn: ["bot", "system"] }, // don't suggest bots in @mention autocomplete
    username: { not: null },
    ...nameFilter,
  }

  const picked = new Set<string>()
  const results: MentionTarget[] = []
  const add = (u: Parameters<typeof toMentionTarget>[0]) => {
    if (picked.has(u.id)) return
    picked.add(u.id)
    results.push(toMentionTarget(u))
  }

  // Tier 1 — recently tagged (people the viewer @mentioned, newest post first).
  const tagged = await prisma.postMention.findMany({
    where: { post: { authorId: viewerId, deletedAt: null }, userId: { not: null }, user: baseWhere },
    orderBy: { post: { createdAt: "desc" } },
    take: limit * 3, // over-fetch: one person may be tagged in many posts
    select: { user: { select: mentionUserSelect } },
  })
  for (const m of tagged) {
    if (results.length >= limit) break
    if (m.user) add(m.user)
  }

  // Viewer's batch + house drive the next two tiers.
  const me = results.length < limit
    ? await prisma.user.findUnique({ where: { id: viewerId }, select: { profile: { select: { batchId: true, houseId: true } } } })
    : null

  // Tier 2 — batchmates.
  if (me?.profile?.batchId && results.length < limit) {
    const mates = await prisma.user.findMany({
      where: { ...baseWhere, id: { notIn: [viewerId, ...picked] }, profile: { batchId: me.profile.batchId } },
      orderBy: { displayName: "asc" },
      take: limit - results.length,
      select: mentionUserSelect,
    })
    mates.forEach(add)
  }

  // Tier 3 — housemates.
  if (me?.profile?.houseId && results.length < limit) {
    const mates = await prisma.user.findMany({
      where: { ...baseWhere, id: { notIn: [viewerId, ...picked] }, profile: { houseId: me.profile.houseId } },
      orderBy: { displayName: "asc" },
      take: limit - results.length,
      select: mentionUserSelect,
    })
    mates.forEach(add)
  }

  // Tier 4 — alphabetical fill.
  if (results.length < limit) {
    const rest = await prisma.user.findMany({
      where: { ...baseWhere, id: { notIn: [viewerId, ...picked] } },
      orderBy: { displayName: "asc" },
      take: limit - results.length,
      select: mentionUserSelect,
    })
    rest.forEach(add)
  }

  return results.slice(0, limit)
}
