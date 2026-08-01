"use server"

import { revalidatePath, updateTag } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { joinGroup, leaveGroup } from "@/modules/groups/service"

export async function joinGroupAction(groupId: string) {
  const user = await requireUser()
  await joinGroup(user.id, groupId)
  // Member count lives in the cached shared list (tag "groups").
  updateTag("groups")
  revalidatePath("/groups")
  revalidatePath(`/groups/${groupId}`)
}

export async function leaveGroupAction(groupId: string) {
  const user = await requireUser()
  await leaveGroup(user.id, groupId)
  updateTag("groups")
  revalidatePath("/groups")
  revalidatePath(`/groups/${groupId}`)
}
