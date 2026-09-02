"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { followUser, unfollowUser } from "@/modules/connections/service"
import { enforceRateLimit } from "@/lib/rate-limit"

export async function followAction(targetUserId: string) {
  const user = await requireUser()
  // Mass-follow guard (audit P1-11): a bot could otherwise follow thousands to
  // farm follow-backs / spread spam via the follow notification.
  await enforceRateLimit({ bucket: "follow", identifier: user.id, limit: 60, windowSec: 3600 })
  await followUser(user.id, targetUserId)
  revalidatePath("/connections")
}

export async function unfollowAction(targetUserId: string) {
  const user = await requireUser()
  await unfollowUser(user.id, targetUserId)
  revalidatePath("/connections")
}
