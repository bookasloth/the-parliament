"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { toggleReaction, createComment, type ReactionType } from "@/modules/feed/posts"

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
