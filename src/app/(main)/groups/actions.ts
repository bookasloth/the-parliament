"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { joinGroup, leaveGroup } from "@/modules/groups/service"

export async function joinGroupAction(groupId: string) {
  const user = await requireUser()
  await joinGroup(user.id, groupId)
  revalidatePath("/groups")
  revalidatePath(`/groups/${groupId}`)
}

export async function leaveGroupAction(groupId: string) {
  const user = await requireUser()
  await leaveGroup(user.id, groupId)
  revalidatePath("/groups")
  revalidatePath(`/groups/${groupId}`)
}
