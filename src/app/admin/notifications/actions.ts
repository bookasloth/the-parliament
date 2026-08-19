"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/gate"
import { enforceAdminRateLimit } from "@/modules/admin/rate-limit"
import {
  validateAnnouncement, createAnnouncement, deleteAnnouncement,
} from "@/modules/announcements/service"
import { botAnnounce } from "@/modules/bot/service"

export interface AnnouncementFormInput {
  title: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  startsAt: string
  endsAt: string
}

export async function createAnnouncementAction(input: AnnouncementFormInput) {
  const admin = await requirePermission("announcements:send")
  await enforceAdminRateLimit(admin.id, "announcement-create", 20, 300)
  const data = validateAnnouncement(input)
  await createAnnouncement(data, admin.id)
  revalidatePath("/admin/notifications")
  revalidatePath("/feed")
  return { ok: true }
}

/** Post a normal feed post authored by the official NNAWCA bot account. */
export async function postAsBotAction(input: { body: string }) {
  const admin = await requirePermission("announcements:send")
  await enforceAdminRateLimit(admin.id, "bot-feed-post", 20, 300)
  const body = input.body?.trim()
  if (!body) throw new Error("Write something to post")
  if (body.length > 5000) throw new Error("Post is too long (max 5000 characters)")
  const post = await botAnnounce({ body })
  if (!post) throw new Error("NNAWCA bot account or school isn't set up")
  revalidatePath("/feed")
  return { ok: true, postId: post.id }
}

export async function deleteAnnouncementAction(id: string) {
  await requirePermission("announcements:send")
  await deleteAnnouncement(id)
  revalidatePath("/admin/notifications")
  revalidatePath("/feed")
  return { ok: true }
}
