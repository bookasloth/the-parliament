"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import {
  toggleReaction,
  createComment,
  deleteComment,
  hidePost,
  editPost,
  deletePost,
  sharePost,
  toggleSavePost,
  givePostAward,
  votePoll,
  type ReactionType,
  type AwardKey,
} from "@/modules/feed/posts"
import {
  toggleCommentReaction,
  searchMentionTargets,
  type CommentReactionType,
} from "@/modules/feed/comments"
import { fileReport, type ReportableEntity } from "@/modules/moderation/service"
import { getFeed, listPostComments } from "@/modules/feed/query"
import { prepareImpressionBatch } from "@/modules/feed/impressions"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"
import { mapRowToFeedPost } from "./map-row"
import { buildCommentViews } from "./[postId]/comment-view"
import type { CommentView } from "./[postId]/comments-section"
import type { FeedPost } from "@/components/shared/FeedCard"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { publicUrlFor } from "@/lib/r2"

export async function reactToPost(postId: string, type: ReactionType) {
  const user = await requireUser()
  const result = await toggleReaction({ userId: user.id, postId, type })
  revalidatePath("/feed")
  return result
}

/** Count visible posts created after `sinceIso` — drives the "N new posts" pill. */
export async function countNewPostsAction(sinceIso: string) {
  const schoolId = await getDefaultSchoolId()
  if (!schoolId) return { count: 0 }
  const since = new Date(sinceIso)
  if (Number.isNaN(since.getTime())) return { count: 0 }
  const viewer = await optionalUser()
  const count = await prisma.post.count({
    where: {
      schoolId,
      deletedAt: null,
      status: "visible",
      createdAt: { gt: since },
      // Don't nag the viewer about their own just-posted content.
      ...(viewer?.id ? { authorId: { not: viewer.id } } : {}),
    },
  })
  return { count }
}

export async function votePollAction(postId: string, pollId: string, optionId: string) {
  const user = await requireUser()
  const r = await votePoll({ userId: user.id, pollId, optionId })
  revalidatePath("/feed")
  revalidatePath(`/feed/${postId}`)
  return r
}

export async function commentOnPost(postId: string, body: string, parentId?: string, imageUrl?: string) {
  const user = await requireUser()
  const comment = await createComment({ userId: user.id, postId, body, parentId, imageUrl })
  revalidatePath("/feed")
  revalidatePath(`/feed/${postId}`)
  return { id: comment.id }
}

export interface InlineComments {
  comments: CommentView[]
  count: number
  viewer: null | { id: string; displayName: string; avatarUrl: string }
}

/** Lazy-load a post's comment thread for the inline feed expander. */
export async function loadPostCommentsAction(postId: string): Promise<InlineComments> {
  const viewer = await optionalUser()
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, commentCount: true, deletedAt: true },
  })
  if (!post || post.deletedAt) return { comments: [], count: 0, viewer: null }

  const rows = await listPostComments(postId, 100, viewer?.id)

  // Which comment authors the viewer already follows → seeds the per-comment CTA
  // so it shows "Message" instead of "Follow" for people already followed.
  let followingIds = new Set<string>()
  if (viewer?.id) {
    const authorIds = [...new Set(rows.flatMap((r) => [r.author.id, ...r.replies.map((rep) => rep.author.id)]))]
    const follows = await prisma.follow.findMany({
      where: { followerId: viewer.id, followingId: { in: authorIds } },
      select: { followingId: true },
    })
    followingIds = new Set(follows.map((f) => f.followingId))
  }

  const comments = buildCommentViews(rows, post.authorId, followingIds)

  let viewerObj: InlineComments["viewer"] = null
  if (viewer?.id) {
    const u = await prisma.user.findUnique({
      where: { id: viewer.id },
      select: {
        id: true,
        displayName: true,
        legalName: true,
        profile: { select: { photoUrl: true } },
      },
    })
    if (u) {
      const name = u.displayName || u.legalName
      viewerObj = {
        id: u.id,
        displayName: name,
        avatarUrl:
          u.profile?.photoUrl ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      }
    }
  }

  return { comments, count: Math.max(post.commentCount, comments.length), viewer: viewerObj }
}

export async function reactToComment(
  postId: string,
  commentId: string,
  type: CommentReactionType,
) {
  const user = await requireUser()
  const result = await toggleCommentReaction({ userId: user.id, commentId, type })
  revalidatePath(`/feed/${postId}`)
  return result
}

export async function deleteCommentAction(postId: string, commentId: string) {
  const user = await requireUser()
  await deleteComment({ userId: user.id, commentId })
  revalidatePath(`/feed/${postId}`)
  return { ok: true as const }
}

export async function hidePostAction(postId: string) {
  const user = await requireUser()
  await hidePost({ userId: user.id, postId })
  revalidatePath("/feed")
  return { ok: true as const }
}

export async function reportCommentAction(postId: string, commentId: string, reason: string) {
  const user = await requireUser()
  await fileReport({
    reporterId: user.id,
    entityType: "comment" as ReportableEntity,
    entityId: commentId,
    reason,
  })
  revalidatePath(`/feed/${postId}`)
  return { ok: true as const }
}

/** Ranked @mention suggestions for the comment composer. */
export async function searchMentionsAction(query: string) {
  const user = await requireUser()
  return searchMentionTargets(user.id, query)
}

export async function updatePostAction(
  postId: string,
  input: {
    body: string
    media?: { key: string; type: "image" | "video" }[]
    textBg?: string
  },
) {
  const user = await requireUser()

  const media = (input.media ?? []).map((m) => ({
    key: m.key,
    type: m.type,
    url: publicUrlFor(m.key),
  }))

  await editPost({
    postId,
    authorId: user.id,
    body: input.body,
    media,
    // Only meaningful for text posts; "" clears the background back to plain.
    textBg: input.textBg ?? "",
  })
  revalidatePath(`/feed/${postId}`)
  revalidatePath("/feed")
  redirect(`/feed/${postId}`)
}

export async function deletePostAction(postId: string) {
  const user = await requireUser()
  await deletePost({ postId, userId: user.id })
  revalidatePath("/feed")
  // No redirect: callers handle navigation. A server redirect here forces a feed
  // re-nav that (under read-replica lag) re-streams the just-deleted row.
}

export async function sharePostAction(postId: string, comment?: string) {
  const user = await requireUser()
  await sharePost({ userId: user.id, postId, comment })
  revalidatePath("/feed")
  revalidatePath(`/feed/${postId}`)
  return { ok: true as const }
}

export async function toggleSavePostAction(postId: string) {
  const user = await requireUser()
  const r = await toggleSavePost({ userId: user.id, postId })
  revalidatePath("/feed")
  revalidatePath(`/feed/${postId}`)
  return r
}

export async function awardPostAction(postId: string, awardKey: AwardKey) {
  const user = await requireUser()
  try {
    await givePostAward({ userId: user.id, postId, awardKey })
    revalidatePath("/feed")
    revalidatePath(`/feed/${postId}`)
    return { ok: true as const }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed"
    return { ok: false as const, error: msg }
  }
}

export async function reportPostAction(
  postId: string,
  reason: string,
  details?: string,
) {
  const user = await requireUser()
  await fileReport({
    reporterId: user.id,
    entityType: "post" as ReportableEntity,
    entityId: postId,
    reason,
    details,
  })
  return { ok: true as const }
}

/**
 * Record that the viewer has seen these posts (feed seen-tracking). Fire-and-
 * forget from the client's impression observer — deliberately does NOT
 * revalidate the feed (an impression must not trigger a re-render/re-fetch).
 * Ids are validated against real, same-school posts before writing so a
 * tampered client can't insert rows for arbitrary post ids.
 */
export async function recordImpressionsAction(postIds: string[]) {
  const viewer = await optionalUser()
  if (!viewer?.id) return { recorded: 0 }

  const ids = prepareImpressionBatch(postIds)
  if (ids.length === 0) return { recorded: 0 }

  const schoolId = await getDefaultSchoolId()
  const existing = await prisma.post.findMany({
    where: { id: { in: ids }, ...(schoolId ? { schoolId } : {}) },
    select: { id: true },
  })
  if (existing.length === 0) return { recorded: 0 }

  await prisma.postImpression.createMany({
    data: existing.map((p) => ({ userId: viewer.id, postId: p.id })),
    skipDuplicates: true,
  })
  return { recorded: existing.length }
}

export interface LoadMoreResult {
  posts: FeedPost[]
  hasMore: boolean
  nextPage: number
}

export async function loadMoreFeedAction(
  page: number,
  pageSize = 15,
  followingOnly = false,
  caughtUp = false,
): Promise<LoadMoreResult> {
  const [schoolId, viewer] = await Promise.all([
    getDefaultSchoolId(),
    optionalUser(),
  ])
  if (!schoolId) return { posts: [], hasMore: false, nextPage: page }

  const { rows } = await getFeed({
    schoolId,
    viewerId: viewer?.id,
    page,
    pageSize,
    followingOnly,
    skipSeenExclusion: caughtUp,
  })
  const followingIds = viewer?.id
    ? new Set(
        (await prisma.follow.findMany({ where: { followerId: viewer.id }, select: { followingId: true } })).map(
          (f) => f.followingId,
        ),
      )
    : undefined
  return {
    posts: rows.map((r) => mapRowToFeedPost(r, followingIds)),
    hasMore: rows.length === pageSize,
    nextPage: page + 1,
  }
}

// ponytail: uses Notification model as the poke store — one egg per (sender,target)
// enforced by a pre-insert existence check. Small race window is acceptable for eggs.
// Add a dedicated Poke model with @@unique([senderId,targetId]) if hard atomicity matters.
export async function throwEgg(targetUsername: string) {
  const sender = await requireUser()
  if (!targetUsername) return { ok: false as const, reason: "no-target" }
  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  })
  if (!target) return { ok: false as const, reason: "not-found" }
  if (target.id === sender.id) return { ok: false as const, reason: "self" }
  const existing = await prisma.notification.findFirst({
    where: { userId: target.id, type: "poke", entityType: "user", entityId: sender.id },
    select: { id: true },
  })
  if (existing) return { ok: false as const, reason: "already-thrown" }
  // ponytail: 20 eggs / rolling 24h per sender. In-DB count; race window fine for eggs.
  // Bump to Redis/token-bucket if abuse shows up.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recent = await prisma.notification.count({
    where: { type: "poke", entityType: "user", entityId: sender.id, createdAt: { gte: since } },
  })
  if (recent >= 20) return { ok: false as const, reason: "rate-limited" }
  const senderName = sender.name ?? "Someone"
  await prisma.notification.create({
    data: {
      userId: target.id,
      type: "poke",
      title: `${senderName} threw an egg at you 🥚`,
      body: null,
      entityType: "user",
      entityId: sender.id,
    },
  })
  return { ok: true as const }
}
