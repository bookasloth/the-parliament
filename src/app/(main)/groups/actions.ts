"use server"

import { revalidatePath, updateTag } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { joinGroup, leaveGroup } from "@/modules/groups/service"
import { groupRequestSchema, type SubmitGroupRequestInput } from "@/modules/groups/request-schema"
import { sendEmail } from "@/lib/email"

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

  // Email all active group members about the request (fire-and-forget).
  notifyGroupMembers(groupId, user.id, category, body).catch(() => {})

  return { ok: true }
}

async function notifyGroupMembers(groupId: string, authorId: string, category: string, body: string) {
  const [group, author, members] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: authorId }, select: { displayName: true, legalName: true } }),
    prisma.groupMember.findMany({
      where: { groupId, status: "active", userId: { not: authorId } },
      select: { user: { select: { id: true, email: true } } },
    }),
  ])
  if (!group || !author || members.length === 0) return

  const fromName = author.displayName || author.legalName
  const baseUrl = process.env.AUTH_URL || "https://nnawca.org"
  const groupUrl = `${baseUrl}/groups/${groupId}`

  await Promise.all(
    members.map((m) =>
      sendEmail("group_request", m.user.email, { fromName, groupName: group.name, category, body, groupUrl }, m.user.id),
    ),
  )
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
