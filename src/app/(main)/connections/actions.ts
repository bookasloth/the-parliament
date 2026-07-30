"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { followUser, unfollowUser } from "@/modules/connections/service"

export async function followAction(targetUserId: string) {
  const user = await requireUser()
  await followUser(user.id, targetUserId)
  revalidatePath("/connections")
}

export async function unfollowAction(targetUserId: string) {
  const user = await requireUser()
  await unfollowUser(user.id, targetUserId)
  revalidatePath("/connections")
}
