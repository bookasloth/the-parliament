import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import { awardKarma } from "@/modules/karma/ledger"
import { KARMA } from "@/config/karma"
import { sendNotification } from "@/modules/notifications/service"
import { audit } from "@/lib/audit"

export type PostFormat = "text" | "image" | "link" | "quote"

export interface CreatePostInput {
  authorId: string
  schoolId: string
  categoryKey: string
  format: PostFormat
  body?: string
  media?: { key: string; type: string }[]
  linkUrl?: string
  groupId?: string
}

export async function createPost(input: CreatePostInput) {
  const category = await prisma.postCategory.findUnique({
    where: { schoolId_key: { schoolId: input.schoolId, key: input.categoryKey } },
  })
  if (!category) throw new ForbiddenError("Unknown post category")

  if (input.format === "text" && !input.body?.trim()) {
    throw new ForbiddenError("Text post needs a body")
  }
  if (input.format === "image" && (!input.media || input.media.length === 0)) {
    throw new ForbiddenError("Image post needs at least one image")
  }
  if (input.format === "link" && !input.linkUrl) {
    throw new ForbiddenError("Link post needs a URL")
  }

  const post = await prisma.post.create({
    data: {
      schoolId: input.schoolId,
      authorId: input.authorId,
      categoryId: category.id,
      groupId: input.groupId,
      format: input.format,
      body: input.body,
      media: input.media ?? [],
      linkUrl: input.linkUrl,
    },
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

  return { reacted: true }
}

function incrementsFor(type: ReactionType, delta: number) {
  if (type === "upvote") return { upvoteCount: { increment: delta } }
  if (type === "downvote") return { downvoteCount: { increment: delta } }
  return { upvoteCount: { increment: delta } }
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

  return comment
}
