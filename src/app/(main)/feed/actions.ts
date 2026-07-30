"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import {
  toggleReaction,
  createComment,
  editPost,
  deletePost,
  sharePost,
  toggleSavePost,
  givePostAward,
  type ReactionType,
  type AwardKey,
} from "@/modules/feed/posts"
import { fileReport, type ReportableEntity } from "@/modules/moderation/service"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export async function reactToPost(postId: string, type: ReactionType) {
  const user = await requireUser()
  const result = await toggleReaction({ userId: user.id, postId, type })
  revalidatePath("/feed")
  return result
}

export async function commentOnPost(postId: string, body: string) {
  const user = await requireUser()
  const comment = await createComment({ userId: user.id, postId, body })
  revalidatePath("/feed")
  revalidatePath(`/feed/${postId}`)
  return { id: comment.id }
}

export async function updatePostAction(postId: string, body: string) {
  const user = await requireUser()
  await editPost({ postId, authorId: user.id, body })
  revalidatePath(`/feed/${postId}`)
  revalidatePath("/feed")
  redirect(`/feed/${postId}`)
}

export async function deletePostAction(postId: string) {
  const user = await requireUser()
  await deletePost({ postId, userId: user.id })
  revalidatePath("/feed")
  redirect("/feed")
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
