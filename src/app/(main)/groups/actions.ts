"use server"

import { revalidatePath, updateTag } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { joinGroup, leaveGroup, createGroupPost, getGroupFeed } from "@/modules/groups/service"
import { groupRequestSchema, type SubmitGroupRequestInput } from "@/modules/groups/request-schema"
import { sendNotification } from "@/modules/notifications/service"
import { enforceRateLimit } from "@/lib/rate-limit"
import { validatePostMedia, publicUrlFor } from "@/lib/r2"
import { mapRowToFeedPost } from "@/app/(main)/feed/map-row"
import type { FeedPost } from "@/components/shared/FeedCard"

export type { SubmitGroupRequestInput }

/** Create a post inside a group (members only). Text + optional images. */
export async function createGroupPostAction(input: {
  groupId: string
  body: string
  media?: { key: string; type: "image" | "video" }[]
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  try {
    await enforceRateLimit({ bucket: "group.post", identifier: user.id, limit: 20, windowSec: 3600 })
    const keys = (input.media ?? []).map((m) => m.key)
    if (keys.length) await validatePostMedia(user.id, keys)
    const media = (input.media ?? []).map((m) => ({ key: m.key, type: m.type, url: publicUrlFor(m.key) }))
    await createGroupPost({
      userId: user.id,
      groupId: input.groupId,
      body: input.body,
      format: media.length ? "image" : "text",
      media: media.length ? media : undefined,
    })
    revalidatePath(`/groups/${input.groupId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to post" }
  }
}

/** Load a group's post feed as mapped FeedPosts (membership-gated). */
export async function loadGroupFeedAction(groupId: string): Promise<FeedPost[]> {
  const user = await requireUser()
  const res = await getGroupFeed(groupId, user.id)
  if (!res) return []
  const following = await prisma.follow.findMany({ where: { followerId: user.id }, select: { followingId: true } })
  const followingIds = new Set(following.map((f) => f.followingId))
  return res.rows.map((r) => mapRowToFeedPost(r, followingIds))
}

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

  // Route through sendNotification (audit P1-3): the old raw sendEmail loop
  // skipped the bell, push, coalescing and per-user preferences. This delivers
  // in-app + push + email (via the group_request template) and honours opt-outs.
  await Promise.all(
    members.map((m) =>
      sendNotification({
        userId: m.user.id,
        kind: "group_request",
        title: `${fromName} posted in ${group.name}`,
        body: `${category}: ${body.slice(0, 140)}`,
        entityType: "group",
        entityId: groupId,
        email: { fromName, groupName: group.name, category, body, groupUrl },
      }).catch(() => {}),
    ),
  )
}

export async function joinGroupAction(groupId: string) {
  const user = await requireUser()
  await enforceRateLimit({ bucket: "group.join", identifier: user.id, limit: 30, windowSec: 3600 })
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
