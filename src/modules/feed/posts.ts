import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import { awardKarma } from "@/modules/karma/ledger"
import { KARMA } from "@/config/karma"
import { sendNotification } from "@/modules/notifications/service"
import { notifyMentions } from "@/modules/feed/mentions"
import { audit } from "@/lib/audit"
import { hotScore, authorQualitySignal } from "@/modules/feed/ranking"
import { isOurPublicUrl } from "@/lib/supabase-storage"

const APP_BASE = process.env.AUTH_URL || "https://nnawca.org"

// Reaction counts that trigger a "your post is trending" mail to the author.
export const REACTION_MILESTONES = [25, 50, 100, 250, 500]

const RANKING_POST_SELECT = {
  upvoteCount: true,
  downvoteCount: true,
  commentCount: true,
  shareCount: true,
  reportPenalty: true,
  createdAt: true,
} as const

/**
 * The author's live cross-post reputation term (Post.qualityScore), derived
 * from the net up-vs-down votes across all their visible posts. Cheap single
 * aggregate; the bounded signal is what feeds hotScore.
 */
async function authorQualityFor(authorId: string): Promise<number> {
  const agg = await prisma.post.aggregate({
    _sum: { upvoteCount: true, downvoteCount: true },
    where: { authorId, deletedAt: null, status: "visible" },
  })
  const net = (agg._sum.upvoteCount ?? 0) - (agg._sum.downvoteCount ?? 0)
  return authorQualitySignal(net)
}

/**
 * Recompute and persist Post.rankingScore (and the author-quality term in
 * Post.qualityScore) from current counters. Called after any engagement
 * mutation so the indexed rankingScore ORDER BY in getFeed stays fresh.
 * ponytail: one read + one aggregate + one write per mutation — fine at this
 * scale; batch/debounce only if write volume ever demands it.
 */
export async function recomputeRankingScore(postId: string) {
  const p = await prisma.post.findUnique({
    where: { id: postId },
    select: { ...RANKING_POST_SELECT, authorId: true },
  })
  if (!p) return
  const quality = await authorQualityFor(p.authorId)
  await prisma.post.update({
    where: { id: postId },
    data: {
      qualityScore: quality,
      rankingScore: hotScore({
        upvoteCount: p.upvoteCount,
        downvoteCount: p.downvoteCount,
        commentCount: p.commentCount,
        shareCount: p.shareCount,
        qualityScore: quality,
        reportPenalty: Number(p.reportPenalty),
        createdAt: p.createdAt,
      }),
    },
  })
}

/**
 * Re-rank an author's recent posts with a freshly-computed author-quality term.
 * Used after a vote so a change in the author's reputation propagates to their
 * OTHER posts immediately (not just the one that was voted on). Author quality
 * is computed once and applied to all — one aggregate + N bounded updates.
 * ponytail: capped at `limit` most-recent posts; a prolific author's older
 * posts refresh on their own engagement. Move to a queued job if a single
 * author's post count or vote velocity makes N updates per vote too heavy.
 */
export async function recomputeAuthorRanking(authorId: string, limit = 100) {
  const quality = await authorQualityFor(authorId)
  const posts = await prisma.post.findMany({
    where: { authorId, deletedAt: null, status: "visible" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, ...RANKING_POST_SELECT },
  })
  await Promise.all(
    posts.map((p) =>
      prisma.post.update({
        where: { id: p.id },
        data: {
          qualityScore: quality,
          rankingScore: hotScore({
            upvoteCount: p.upvoteCount,
            downvoteCount: p.downvoteCount,
            commentCount: p.commentCount,
            shareCount: p.shareCount,
            qualityScore: quality,
            reportPenalty: Number(p.reportPenalty),
            createdAt: p.createdAt,
          }),
        },
      }),
    ),
  )
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
  /** Save as a draft (status "draft") — hidden from feeds/timelines, no mention pings. */
  asDraft?: boolean
}

export async function createPost(input: CreatePostInput) {
  const category = await prisma.postCategory.findUnique({
    where: { schoolId_key: { schoolId: input.schoolId, key: input.categoryKey } },
  })
  if (!category) throw new ForbiddenError("Unknown post category")

  // Drafts may be incomplete — skip the per-format "needs X" gates, but still
  // reject a completely empty draft (nothing to save).
  let pollOptions: string[] = []
  if (input.asDraft) {
    const empty =
      !input.body?.trim() &&
      (!input.media || input.media.length === 0) &&
      !input.linkUrl?.trim() &&
      !input.poll?.question?.trim()
    if (empty) throw new ForbiddenError("Nothing to save as a draft")
    if (input.format === "poll") {
      pollOptions = (input.poll?.options ?? []).map((o) => o.trim()).filter(Boolean).slice(0, 6)
    }
  } else {
    if ((input.format === "text" || input.format === "question" || input.format === "quote") && !input.body?.trim()) {
      throw new ForbiddenError("This post needs a body")
    }
    if (input.format === "image" && (!input.media || input.media.length === 0)) {
      throw new ForbiddenError("Image post needs at least one image")
    }
    if (input.format === "link" && !input.linkUrl) {
      throw new ForbiddenError("Link post needs a URL")
    }
    if (input.format === "poll") {
      if (!input.poll?.question?.trim()) throw new ForbiddenError("Poll needs a question")
      pollOptions = input.poll.options.map((o) => o.trim()).filter(Boolean)
      if (pollOptions.length < 2) throw new ForbiddenError("Poll needs at least 2 options")
      if (pollOptions.length > 6) throw new ForbiddenError("Poll allows at most 6 options")
    }
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
        status: input.asDraft ? "draft" : "visible",
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
    if (input.format === "poll" && input.poll?.question?.trim()) {
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

  // Drafts aren't published — don't fire @mention notifications yet.
  if (input.body && !input.asDraft) {
    const author = await prisma.user.findUnique({
      where: { id: input.authorId },
      select: { displayName: true, legalName: true },
    })
    const authorName = input.isAnonymous
      ? "Someone"
      : author?.displayName || author?.legalName || "Someone"
    await notifyMentions({
      body: input.body,
      authorId: input.authorId,
      authorName,
      postId: post.id,
      url: `${APP_BASE}/feed/${post.id}`,
    })
  }

  return post
}

/** The current user's draft posts, newest first. */
export async function listDrafts(authorId: string) {
  return prisma.post.findMany({
    where: { authorId, status: "draft", deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      format: true,
      body: true,
      media: true,
      linkUrl: true,
      createdAt: true,
    },
  })
}

/** Publish a draft: flip it to visible, reseed its ranking, fire @mention pings. */
export async function publishDraft(input: { postId: string; authorId: string }) {
  const post = await prisma.post.findUnique({ where: { id: input.postId } })
  if (!post || post.deletedAt || post.status !== "draft") throw new ForbiddenError("Draft not found")
  if (post.authorId !== input.authorId) throw new ForbiddenError("Not the author")

  const now = new Date()
  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: "visible",
      createdAt: now,
      rankingScore: hotScore({
        upvoteCount: 0, downvoteCount: 0, commentCount: 0, shareCount: 0,
        qualityScore: 0, reportPenalty: 0, createdAt: now,
      }),
    },
  })

  if (post.body) {
    const author = await prisma.user.findUnique({
      where: { id: post.authorId },
      select: { displayName: true, legalName: true },
    })
    const authorName = post.isAnonymous
      ? "Someone"
      : author?.displayName || author?.legalName || "Someone"
    await notifyMentions({
      body: post.body,
      authorId: post.authorId,
      authorName,
      postId: post.id,
      url: `${APP_BASE}/feed/${post.id}`,
    })
  }
  return { id: post.id }
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
  // undefined = leave unchanged; null/"" = clear the background (plain).
  textBg?: string | null
}) {
  const post = await prisma.post.findUnique({ where: { id: input.postId } })
  if (!post || post.deletedAt) throw new ForbiddenError("Post not found")
  if (post.authorId !== input.authorId) throw new ForbiddenError("Not the author")

  await prisma.post.update({
    where: { id: input.postId },
    data: {
      body: input.body ?? post.body,
      media: input.media ?? (post.media as never),
      ...(input.textBg !== undefined ? { textBg: input.textBg || null } : {}),
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

  // upvote_count/downvote_count are maintained by a DB trigger
  // (post_counter_triggers migration) — this only writes the reaction row.
  if (existing && existing.type === input.type) {
    await prisma.reaction.delete({ where: { id: existing.id } })
    // Un-voting shifts the author's reputation → re-rank their recent posts.
    await recomputeAuthorRanking(post.authorId)
    return { reacted: false }
  }

  if (existing) {
    await prisma.reaction.update({ where: { id: existing.id }, data: { type: input.type } })
  } else {
    await prisma.reaction.create({
      data: {
        userId: input.userId,
        entityType: "post",
        entityId: input.postId,
        type: input.type,
      },
    })
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

      // In-app notification (no email — reactions are too frequent to mail).
      // ponytail: fires on add + on switch-from-downvote; rapid toggle can dup.
      // Add a "already notified" guard only if users complain of noise.
      const actor = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { displayName: true, legalName: true },
      })
      const fromName = actor?.displayName || actor?.legalName || "Someone"
      await sendNotification({
        userId: post.authorId,
        kind: "reaction_on_post",
        title: `${fromName} reacted to your post`,
        entityType: "post",
        entityId: post.id,
        sendEmail: false,
      })

      // Milestone email to the author when the post crosses a reaction threshold.
      // Counts are trigger-maintained, so re-read after the write. Exact-equality
      // fires once per threshold; a rapid unreact/re-react could refire — rare.
      const fresh = await prisma.post.findUnique({
        where: { id: post.id },
        select: { upvoteCount: true },
      })
      if (fresh && REACTION_MILESTONES.includes(fresh.upvoteCount)) {
        await sendNotification({
          userId: post.authorId,
          kind: "reaction_milestone",
          title: `Your post hit ${fresh.upvoteCount} reactions`,
          entityType: "post",
          entityId: post.id,
          email: { postUrl: `${APP_BASE}/feed/${post.id}`, count: String(fresh.upvoteCount) },
        })
      }
    } else if (input.type === "downvote") {
      await awardKarma({
        userId: input.userId,
        actionType: "downvote_post_actor",
        baseValue: KARMA.CONTENT.DOWNVOTE_POST.actor,
        counterpartyId: post.authorId,
        role: "actor",
        entityType: "post",
        entityId: post.id,
      })
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

  // A vote changes this author's net reputation → propagate to their posts.
  await recomputeAuthorRanking(post.authorId)
  return { reacted: true }
}

// Award catalog now lives in src/config/post-awards.ts (shared with the UI).
import { POST_AWARDS, type AwardKey } from "@/config/post-awards"
export { POST_AWARDS, type AwardKey }

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
  // share_count is maintained by a DB trigger (post_counter_triggers migration).
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
  imageUrl?: string
}) {
  // An image-only comment (no text) is allowed; reject only when both are empty.
  const image = input.imageUrl?.trim() || null
  if (!input.body.trim() && !image) throw new ForbiddenError("Empty comment")
  // Only accept image URLs that point at our own storage bucket — never an
  // arbitrary client-supplied third-party URL.
  if (image && !isOurPublicUrl(image)) throw new ForbiddenError("Invalid image reference")
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
      imageUrl: image,
    },
  })

  // comment_count is maintained by a DB trigger (post_counter_triggers migration).
  await recomputeRankingScore(input.postId)

  {
    const commenter = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { displayName: true, legalName: true },
    })
    await notifyMentions({
      body: input.body,
      authorId: input.userId,
      authorName: commenter?.displayName || commenter?.legalName || "Someone",
      postId: input.postId,
      url: `${APP_BASE}/feed/${input.postId}`,
    })
  }

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
  // comment_count is maintained by a DB trigger (post_counter_triggers migration),
  // which counts only non-deleted comments — so the soft-delete above is reflected.
  await recomputeRankingScore(c.postId)
}
