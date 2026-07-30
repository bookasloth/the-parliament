import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import { awardKarma } from "@/modules/karma/ledger"
import { KARMA } from "@/config/karma"
import { sendNotification } from "@/modules/notifications/service"
import { audit } from "@/lib/audit"
import { hotScore } from "@/modules/feed/ranking"

/**
 * Recompute and persist Post.rankingScore from the post's current counters.
 * Called after any engagement mutation so the indexed rankingScore ORDER BY in
 * getFeed stays fresh. ponytail: one extra read+write per mutation — fine at
 * this scale; batch/debounce only if write volume ever demands it.
 */
export async function recomputeRankingScore(postId: string) {
  const p = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      upvoteCount: true,
      downvoteCount: true,
      commentCount: true,
      shareCount: true,
      qualityScore: true,
      reportPenalty: true,
      createdAt: true,
    },
  })
  if (!p) return
  await prisma.post.update({
    where: { id: postId },
    data: {
      rankingScore: hotScore({
        upvoteCount: p.upvoteCount,
        downvoteCount: p.downvoteCount,
        commentCount: p.commentCount,
        shareCount: p.shareCount,
        qualityScore: Number(p.qualityScore),
        reportPenalty: Number(p.reportPenalty),
        createdAt: p.createdAt,
      }),
    },
  })
}

export type PostFormat = "text" | "image" | "link" | "quote" | "question" | "poll"

export interface CreatePostInput {
  authorId: string
  schoolId: string
  categoryKey: string
  format: PostFormat
  body?: string
  media?: { key: string; type: string; url?: string; bg?: string }[]
  linkUrl?: string
  poll?: { question: string; options: string[] }
  groupId?: string
  quoteSource?: string
  isAnonymous?: boolean
  textBg?: string
  visibilityScope?: string
}

export async function createPost(input: CreatePostInput) {
  const category = await prisma.postCategory.findUnique({
    where: { schoolId_key: { schoolId: input.schoolId, key: input.categoryKey } },
  })
  if (!category) throw new ForbiddenError("Unknown post category")

  if ((input.format === "text" || input.format === "question" || input.format === "quote") && !input.body?.trim()) {
    throw new ForbiddenError("This post needs a body")
  }
  if (input.format === "image" && (!input.media || input.media.length === 0)) {
    throw new ForbiddenError("Image post needs at least one image")
  }
  if (input.format === "link" && !input.linkUrl) {
    throw new ForbiddenError("Link post needs a URL")
  }
  let pollOptions: string[] = []
  if (input.format === "poll") {
    if (!input.poll?.question?.trim()) throw new ForbiddenError("Poll needs a question")
    pollOptions = input.poll.options.map((o) => o.trim()).filter(Boolean)
    if (pollOptions.length < 2) throw new ForbiddenError("Poll needs at least 2 options")
    if (pollOptions.length > 6) throw new ForbiddenError("Poll allows at most 6 options")
  }

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        schoolId: input.schoolId,
        authorId: input.authorId,
        categoryId: category.id,
        groupId: input.groupId,
        format: input.format,
        body: input.body,
        media: input.media ?? [],
        linkUrl: input.linkUrl,
        quoteSource: input.quoteSource,
        isAnonymous: input.isAnonymous ?? false,
        textBg: input.textBg,
        visibilityScope: input.visibilityScope ?? "public",
      },
    })
    // Seed rankingScore from creation time so a brand-new post has a real
    // (recency-based) score before any engagement arrives.
    await tx.post.update({
      where: { id: created.id },
      data: {
        rankingScore: hotScore({
          upvoteCount: 0,
          downvoteCount: 0,
          commentCount: 0,
          shareCount: 0,
          qualityScore: 0,
          reportPenalty: 0,
          createdAt: created.createdAt,
        }),
      },
    })
    if (input.format === "poll" && input.poll) {
      await tx.poll.create({
        data: {
          postId: created.id,
          question: input.poll.question.trim(),
          options: {
            create: pollOptions.map((label, i) => ({ label, sortOrder: i })),
          },
        },
      })
    }
    return created
  })

  await audit({
    actorId: input.authorId,
    action: "post.create",
    entityType: "post",
    entityId: post.id,
    payload: { format: input.format, category: input.categoryKey },
  })

  return post
}

/** Cast a vote (or switch it) on a poll. Single-choice: one vote per user per poll. */
export async function votePoll(input: { userId: string; pollId: string; optionId: string }) {
  const option = await prisma.pollOption.findUnique({
    where: { id: input.optionId },
    select: { id: true, pollId: true, poll: { select: { expiresAt: true } } },
  })
  if (!option || option.pollId !== input.pollId) throw new ForbiddenError("Option not on this poll")
  if (option.poll.expiresAt && option.poll.expiresAt < new Date()) {
    throw new ForbiddenError("Poll has closed")
  }

  const existing = await prisma.pollVote.findUnique({
    where: { userId_pollId: { userId: input.userId, pollId: input.pollId } },
  })
  if (existing?.optionId === input.optionId) return { optionId: input.optionId }

  await prisma.$transaction(async (tx) => {
    if (existing) {
      // Switch: move the tally from the old option to the new one.
      await tx.pollVote.update({
        where: { userId_pollId: { userId: input.userId, pollId: input.pollId } },
        data: { optionId: input.optionId },
      })
      await tx.pollOption.update({ where: { id: existing.optionId }, data: { voteCount: { decrement: 1 } } })
      await tx.pollOption.update({ where: { id: input.optionId }, data: { voteCount: { increment: 1 } } })
    } else {
      await tx.pollVote.create({
        data: { userId: input.userId, pollId: input.pollId, optionId: input.optionId },
      })
      await tx.pollOption.update({ where: { id: input.optionId }, data: { voteCount: { increment: 1 } } })
      await tx.poll.update({ where: { id: input.pollId }, data: { totalVotes: { increment: 1 } } })
    }
  })
  return { optionId: input.optionId }
}

export async function editPost(input: {
  postId: string
  authorId: string
  body?: string
  media?: { key: string; type: string }[]
}) {
  const post = await prisma.post.findUnique({ where: { id: input.postId } })
  if (!post || post.deletedAt) throw new ForbiddenError("Post not found")
  if (post.authorId !== input.authorId) throw new ForbiddenError("Not the author")

  await prisma.post.update({
    where: { id: input.postId },
    data: {
      body: input.body ?? post.body,
      media: input.media ?? (post.media as never),
      isEdited: true,
      editedAt: new Date(),
    },
  })
}

export async function deletePost(input: { postId: string; userId: string }) {
  const post = await prisma.post.findUnique({ where: { id: input.postId } })
  if (!post || post.deletedAt) throw new ForbiddenError("Post not found")
  if (post.authorId !== input.userId) throw new ForbiddenError("Not the author")

  await prisma.post.update({
    where: { id: input.postId },
    data: { deletedAt: new Date(), status: "deleted" },
  })

  await audit({
    actorId: input.userId,
    action: "post.delete",
    entityType: "post",
    entityId: post.id,
  })
}

export type ReactionType = "upvote" | "downvote" | "like"

export async function toggleReaction(input: {
  userId: string
  postId: string
  type: ReactionType
}) {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { id: true, authorId: true, deletedAt: true },
  })
  if (!post || post.deletedAt) throw new ForbiddenError("Post not found")

  const existing = await prisma.reaction.findUnique({
    where: {
      userId_entityType_entityId: {
        userId: input.userId,
        entityType: "post",
        entityId: input.postId,
      },
    },
  })

  if (existing && existing.type === input.type) {
    await prisma.$transaction([
      prisma.reaction.delete({ where: { id: existing.id } }),
      prisma.post.update({
        where: { id: input.postId },
        data: incrementsFor(input.type, -1),
      }),
    ])
    await recomputeRankingScore(input.postId)
    return { reacted: false }
  }

  if (existing) {
    await prisma.$transaction([
      prisma.reaction.update({ where: { id: existing.id }, data: { type: input.type } }),
      prisma.post.update({
        where: { id: input.postId },
        data: {
          ...incrementsFor(existing.type as ReactionType, -1),
          ...incrementsFor(input.type, 1),
        },
      }),
    ])
  } else {
    await prisma.$transaction([
      prisma.reaction.create({
        data: {
          userId: input.userId,
          entityType: "post",
          entityId: input.postId,
          type: input.type,
        },
      }),
      prisma.post.update({
        where: { id: input.postId },
        data: incrementsFor(input.type, 1),
      }),
    ])
  }

  if (input.userId !== post.authorId) {
    if (input.type === "upvote" || input.type === "like") {
      await awardKarma({
        userId: input.userId,
        actionType: "post_like_actor",
        baseValue: KARMA.CONTENT.LIKE.actor,
        counterpartyId: post.authorId,
        role: "actor",
        entityType: "post",
        entityId: post.id,
      })
      await awardKarma({
        userId: post.authorId,
        actionType: "post_like_publisher",
        baseValue: KARMA.CONTENT.LIKE.publisher,
        counterpartyId: input.userId,
        role: "publisher",
        entityType: "post",
        entityId: post.id,
      })
    } else if (input.type === "downvote") {
      await awardKarma({
        userId: post.authorId,
        actionType: "downvote_publisher",
        baseValue: KARMA.CONTENT.DOWNVOTE_POST.publisher,
        counterpartyId: input.userId,
        role: "publisher",
        entityType: "post",
        entityId: post.id,
      })
    }
  }

  await recomputeRankingScore(input.postId)
  return { reacted: true }
}

function incrementsFor(type: ReactionType, delta: number) {
  if (type === "upvote") return { upvoteCount: { increment: delta } }
  if (type === "downvote") return { downvoteCount: { increment: delta } }
  return { upvoteCount: { increment: delta } }
}

/** Server-side award catalog. Client cannot pick a cost. */
export const POST_AWARDS: Record<string, { label: string; cost: number }> = {
  GOAT: { label: "GOAT", cost: 50 },
  SHITPOST: { label: "Shitpost", cost: 20 },
  FIRE: { label: "Fire Post", cost: 30 },
  BRAIN: { label: "Big Brain", cost: 40 },
  LOL: { label: "LOL", cost: 25 },
  MICDROP: { label: "Mic Drop", cost: 35 },
  SUPPORT: { label: "Support", cost: 30 },
  WTF: { label: "WTF", cost: 28 },
  CLAP: { label: "Clap", cost: 22 },
  CROWN: { label: "Crown", cost: 60 },
  ANGEL: { label: "Angel", cost: 45 },
  ROCKET: { label: "Rocket", cost: 55 },
}

export type AwardKey = keyof typeof POST_AWARDS

export async function sharePost(input: {
  userId: string
  postId: string
  comment?: string
}) {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { id: true, deletedAt: true },
  })
  if (!post || post.deletedAt) throw new ForbiddenError("Post not found")

  const share = await prisma.postShare.create({
    data: {
      originalPostId: input.postId,
      sharerId: input.userId,
      comment: input.comment,
    },
  })
  await prisma.post.update({
    where: { id: input.postId },
    data: { shareCount: { increment: 1 } },
  })
  await recomputeRankingScore(input.postId)
  return share
}

export async function toggleSavePost(input: { userId: string; postId: string }) {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { id: true, deletedAt: true },
  })
  if (!post || post.deletedAt) throw new ForbiddenError("Post not found")

  const existing = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId: input.userId, postId: input.postId } },
  })
  if (existing) {
    await prisma.savedPost.delete({
      where: { userId_postId: { userId: input.userId, postId: input.postId } },
    })
    return { saved: false }
  }
  await prisma.savedPost.create({
    data: { userId: input.userId, postId: input.postId },
  })
  return { saved: true }
}

export async function givePostAward(input: {
  userId: string
  postId: string
  awardKey: AwardKey
}) {
  const spec = POST_AWARDS[input.awardKey]
  if (!spec) throw new ForbiddenError("Unknown award")

  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { id: true, authorId: true, deletedAt: true },
  })
  if (!post || post.deletedAt) throw new ForbiddenError("Post not found")
  if (post.authorId === input.userId) throw new ForbiddenError("Can't award own post")

  const { spendKarma } = await import("@/modules/karma/ledger")
  await spendKarma({
    userId: input.userId,
    amount: spec.cost,
    reasonCode: "post_award",
    entityType: "post",
    entityId: post.id,
  })

  const award = await prisma.postAward.create({
    data: {
      postId: post.id,
      userId: input.userId,
      awardType: input.awardKey,
      karmaCost: spec.cost,
    },
  })
  return award
}

export async function createComment(input: {
  userId: string
  postId: string
  body: string
  parentId?: string
}) {
  if (!input.body.trim()) throw new ForbiddenError("Empty comment")
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { id: true, authorId: true, deletedAt: true },
  })
  if (!post || post.deletedAt) throw new ForbiddenError("Post not found")

  const comment = await prisma.comment.create({
    data: {
      postId: input.postId,
      authorId: input.userId,
      parentId: input.parentId,
      body: input.body,
    },
  })

  await prisma.post.update({
    where: { id: input.postId },
    data: { commentCount: { increment: 1 } },
  })
  await recomputeRankingScore(input.postId)

  if (input.userId !== post.authorId) {
    await awardKarma({
      userId: input.userId,
      actionType: "comment_actor",
      baseValue: KARMA.CONTENT.COMMENT.actor,
      counterpartyId: post.authorId,
      role: "actor",
      entityType: "post",
      entityId: post.id,
    })
    await awardKarma({
      userId: post.authorId,
      actionType: "comment_publisher",
      baseValue: KARMA.CONTENT.COMMENT.publisher,
      counterpartyId: input.userId,
      role: "publisher",
      entityType: "post",
      entityId: post.id,
    })

    const actor = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { displayName: true, legalName: true, username: true },
    })
    const fromName = actor?.displayName || actor?.legalName || "Someone"
    const postUrl = `${process.env.AUTH_URL || ""}/feed/${post.id}`
    await sendNotification({
      userId: post.authorId,
      kind: "comment_on_post",
      title: `${fromName} commented on your post`,
      entityType: "post",
      entityId: post.id,
      email: { fromName, postUrl },
    })
  }

  // Reply → also notify the parent commenter (in-app only), unless they're the
  // actor or the post author (already notified above).
  if (input.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: input.parentId },
      select: { authorId: true },
    })
    if (parent && parent.authorId !== input.userId && parent.authorId !== post.authorId) {
      const actor = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { displayName: true, legalName: true },
      })
      const fromName = actor?.displayName || actor?.legalName || "Someone"
      await sendNotification({
        userId: parent.authorId,
        kind: "comment_on_post",
        title: `${fromName} replied to your comment`,
        entityType: "post",
        entityId: post.id,
        sendEmail: false,
      })
    }
  }

  return comment
}

/** "Not interested" — hide a post from the viewer's feed. Idempotent. */
export async function hidePost(input: { userId: string; postId: string }) {
  await prisma.hiddenPost.upsert({
    where: { userId_postId: { userId: input.userId, postId: input.postId } },
    create: { userId: input.userId, postId: input.postId },
    update: {},
  })
}

/** Soft-delete a comment (author only). Decrements the post's comment count. */
export async function deleteComment(input: { userId: string; commentId: string }) {
  const c = await prisma.comment.findUnique({
    where: { id: input.commentId },
    select: { id: true, authorId: true, postId: true, deletedAt: true },
  })
  if (!c || c.deletedAt) throw new ForbiddenError("Comment not found")
  if (c.authorId !== input.userId) throw new ForbiddenError("Not the author")

  await prisma.comment.update({ where: { id: c.id }, data: { deletedAt: new Date() } })
  // ponytail: decrements 1 even if the comment had replies (they get hidden with
  // it); exact recount only matters if reply threads grow deep.
  await prisma.post.update({
    where: { id: c.postId },
    data: { commentCount: { decrement: 1 } },
  })
  await recomputeRankingScore(c.postId)
}
