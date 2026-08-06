"use server"

import { revalidatePath, updateTag } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { joinGroup, leaveGroup } from "@/modules/groups/service"
import { groupRequestSchema, type SubmitGroupRequestInput } from "@/modules/groups/request-schema"

export type { SubmitGroupRequestInput }

/** Post a help request to a group. Requires active membership. */
export async function submitGroupRequestAction(
  input: SubmitGroupRequestInput,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  const parsed = groupRequestSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }
  const { groupId, category, body } = parsed.data

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
    select: { status: true },
  })
  if (membership?.status !== "active") return { ok: false, error: "Join the group to post a request" }

  await prisma.groupRequest.create({ data: { groupId, userId: user.id, category, body } })
  revalidatePath(`/groups/${groupId}`)
  return { ok: true }
}

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
