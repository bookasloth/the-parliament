"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { toggleReaction, createComment, type ReactionType } from "@/modules/feed/posts"
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
  return { id: comment.id }
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
