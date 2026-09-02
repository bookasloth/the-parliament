"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { followUser, unfollowUser } from "@/modules/connections/service"
import { inviteByEmail } from "@/modules/connections/invites"
import { enforceRateLimit, RateLimitedError } from "@/lib/rate-limit"

/** Member-initiated referral invite (audit P1-19). Quota-limited per day. */
export async function inviteFriendAction(email: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  try {
    await enforceRateLimit({ bucket: "invite.send", identifier: user.id, limit: 20, windowSec: 86_400 })
  } catch (e) {
    if (e instanceof RateLimitedError) return { ok: false, error: "You've hit today's invite limit. Try again tomorrow." }
    throw e
  }
  const res = await inviteByEmail({ id: user.id, name: user.name ?? "A member" }, email)
  if (res.ok) return { ok: true }
  return {
    ok: false,
    error:
      res.reason === "already_member" ? "That person is already on NNAWCA." :
      res.reason === "invalid_email" ? "Enter a valid email address." :
      "Couldn't send the invite. Try again.",
  }
}

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
