"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import {
  markRead,
  markAllRead,
  deleteNotification,
} from "@/modules/notifications/service"

export async function markNotificationReadAction(id: string) {
  const user = await requireUser()
  await markRead(user.id, id)
  revalidatePath("/notifications")
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser()
  await markAllRead(user.id)
  revalidatePath("/notifications")
}

export async function deleteNotificationAction(id: string) {
  const user = await requireUser()
  await deleteNotification(user.id, id)
  revalidatePath("/notifications")
}
