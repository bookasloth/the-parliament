"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/gate"
import { enforceAdminRateLimit } from "@/modules/admin/rate-limit"
import {
  validateAnnouncement, createAnnouncement, deleteAnnouncement,
} from "@/modules/announcements/service"

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

export async function deleteAnnouncementAction(id: string) {
  await requirePermission("announcements:send")
  await deleteAnnouncement(id)
  revalidatePath("/admin/notifications")
  revalidatePath("/feed")
  return { ok: true }
}
