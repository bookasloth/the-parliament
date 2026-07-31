import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import type { ConversationSummary, MessageView } from "./types"

export function dmKeyFor(a: string, b: string): string {
  return [a, b].sort().join(":")
}

export async function canMessage(viewerId: string, otherId: string): Promise<boolean> {
  if (viewerId === otherId) return false
  const rel = await prisma.follow.findFirst({
    where: {
      OR: [
        { followerId: viewerId, followingId: otherId },
        { followerId: otherId, followingId: viewerId },
      ],
    },
    select: { followerId: true },
  })
  return !!rel
}

export async function findOrCreateConversation(viewerId: string, otherId: string): Promise<{ id: string }> {
  if (!(await canMessage(viewerId, otherId))) {
    throw new ForbiddenError("You can only message your connections")
  }
  const dmKey = dmKeyFor(viewerId, otherId)
  const existing = await prisma.conversation.findUnique({ where: { dmKey }, select: { id: true } })
  if (existing) return existing
  const conv = await prisma.conversation.create({
    data: {
      dmKey,
      participants: { create: [{ userId: viewerId }, { userId: otherId }] },
    },
    select: { id: true },
  })
  return conv
}

async function assertParticipant(viewerId: string, conversationId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    select: { userId: true },
  })
  if (!p) throw new ForbiddenError("Not a participant")
}

export async function listConversations(viewerId: string): Promise<ConversationSummary[]> {
  const rows = await prisma.conversation.findMany({
    where: { participants: { some: { userId: viewerId } } },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    select: {
      id: true,
      lastMessageAt: true,
      participants: {
        select: { userId: true, lastReadAt: true, user: { select: { id: true, displayName: true, legalName: true, username: true, profile: { select: { photoUrl: true } } } } },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1, where: { deletedAt: null }, select: { body: true, media: true } },
    },
  })
  return Promise.all(rows.map(async (c) => {
    const me = c.participants.find((p) => p.userId === viewerId)!
    const other = c.participants.find((p) => p.userId !== viewerId)!.user
    const unreadCount = await prisma.message.count({
      where: {
        conversationId: c.id, deletedAt: null, senderId: { not: viewerId },
        ...(me.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
      },
    })
    const last = c.messages[0]
    return {
      id: c.id,
      otherUser: { id: other.id, name: other.displayName || other.legalName, username: other.username, avatar: other.profile?.photoUrl ?? null },
      lastMessagePreview: last ? (last.body || ((last.media as string[]).length ? "📷 Photo" : "")) : "",
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      unreadCount,
    }
  }))
}

export async function getConversationMeta(
  viewerId: string,
  conversationId: string,
): Promise<{ otherUser: { id: string; name: string; username: string | null; avatar: string | null }; otherLastReadAt: string | null }> {
  await assertParticipant(viewerId, conversationId)
  const other = await prisma.conversationParticipant.findFirstOrThrow({
    where: { conversationId, userId: { not: viewerId } },
    select: {
      lastReadAt: true,
      user: { select: { id: true, displayName: true, legalName: true, username: true, profile: { select: { photoUrl: true } } } },
    },
  })
  return {
    otherUser: {
      id: other.user.id,
      name: other.user.displayName || other.user.legalName,
      username: other.user.username,
      avatar: other.user.profile?.photoUrl ?? null,
    },
    otherLastReadAt: other.lastReadAt?.toISOString() ?? null,
  }
}

export async function getMessages(
  viewerId: string,
  conversationId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<MessageView[]> {
  await assertParticipant(viewerId, conversationId)
  const limit = Math.min(opts.limit ?? 50, 100)
  const rows = await prisma.message.findMany({
    where: { conversationId, ...(opts.before ? { createdAt: { lt: new Date(opts.before) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, senderId: true, body: true, media: true, createdAt: true, editedAt: true, deletedAt: true },
  })
  return rows.reverse().map((m) => ({
    id: m.id, senderId: m.senderId,
    body: m.deletedAt ? "" : m.body,
    media: m.deletedAt ? [] : (m.media as string[]),
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    deleted: !!m.deletedAt,
  }))
}

export async function sendMessage(
  viewerId: string,
  conversationId: string,
  input: { body: string; media?: string[] },
): Promise<MessageView> {
  await assertParticipant(viewerId, conversationId)
  const body = input.body.trim()
  const media = input.media ?? []
  if (!body && media.length === 0) throw new ForbiddenError("Empty message")
  const [msg] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: viewerId, body, media },
      select: { id: true, senderId: true, body: true, media: true, createdAt: true, editedAt: true, deletedAt: true },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ])
  return {
    id: msg.id, senderId: msg.senderId, body: msg.body, media: msg.media as string[],
    createdAt: msg.createdAt.toISOString(), editedAt: null, deleted: false,
  }
}

async function assertAuthor(viewerId: string, messageId: string) {
  const m = await prisma.message.findUnique({ where: { id: messageId }, select: { senderId: true } })
  if (!m || m.senderId !== viewerId) throw new ForbiddenError("Not the author")
}

export async function editMessage(viewerId: string, messageId: string, body: string): Promise<void> {
  await assertAuthor(viewerId, messageId)
  const trimmed = body.trim()
  if (!trimmed) throw new ForbiddenError("Empty message")
  await prisma.message.update({ where: { id: messageId }, data: { body: trimmed, editedAt: new Date() } })
}

export async function deleteMessage(viewerId: string, messageId: string): Promise<void> {
  await assertAuthor(viewerId, messageId)
  await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } })
}

export async function markRead(viewerId: string, conversationId: string): Promise<void> {
  await assertParticipant(viewerId, conversationId)
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    data: { lastReadAt: new Date() },
  })
}
