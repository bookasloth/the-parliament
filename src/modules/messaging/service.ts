import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { isOurPublicUrl } from "@/lib/supabase-storage"
import { broadcast } from "@/lib/supabase-realtime"
import type { ConversationSummary, MessageView } from "./types"

const MAX_MESSAGE_LEN = 5000

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
    // lastMessageAt is only set by sendMessage, so an opened-but-never-used chat
    // (findOrCreateConversation writes the row on "Message" click) stays out of
    // both sidebars until someone actually says something.
    where: { participants: { some: { userId: viewerId } }, lastMessageAt: { not: null } },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    select: {
      id: true,
      lastMessageAt: true,
      participants: {
        select: { userId: true, lastReadAt: true, user: { select: { id: true, displayName: true, legalName: true, username: true, isVerified: true, profile: { select: { photoUrl: true } } } } },
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
      otherUser: { id: other.id, name: other.displayName || other.legalName, username: other.username, avatar: other.profile?.photoUrl ?? null, isVerified: other.isVerified },
      lastMessagePreview: last ? (last.body || ((last.media as string[]).length ? "📷 Photo" : "")) : "",
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      unreadCount,
    }
  }))
}

export async function getConversationMeta(
  viewerId: string,
  conversationId: string,
): Promise<{ otherUser: { id: string; name: string; username: string | null; avatar: string | null; isVerified: boolean }; otherLastReadAt: string | null }> {
  await assertParticipant(viewerId, conversationId)
  const other = await prisma.conversationParticipant.findFirstOrThrow({
    where: { conversationId, userId: { not: viewerId } },
    select: {
      lastReadAt: true,
      user: { select: { id: true, displayName: true, legalName: true, username: true, isVerified: true, profile: { select: { photoUrl: true } } } },
    },
  })
  return {
    otherUser: {
      id: other.user.id,
      name: other.user.displayName || other.user.legalName,
      username: other.user.username,
      avatar: other.user.profile?.photoUrl ?? null,
      isVerified: other.user.isVerified,
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
  const body = input.body.trim()
  if (body.length > MAX_MESSAGE_LEN) throw new ForbiddenError("Message too long")
  const media = input.media ?? []
  if (media.some((m) => !isOurPublicUrl(m))) throw new ForbiddenError("Invalid media URL")
  if (!body && media.length === 0) throw new ForbiddenError("Empty message")

  // One roundtrip instead of five (participant check + BEGIN + insert + update +
  // COMMIT). Over a pooled remote Postgres that was the bulk of send latency.
  // The insert is gated on participation, so a non-participant inserts 0 rows.
  const rows = await prisma.$queryRaw<
    { id: string; sender_id: string; body: string; media: string[]; created_at: Date }[]
  >`
    WITH ins AS (
      INSERT INTO messages (id, conversation_id, sender_id, body, media, created_at)
      SELECT gen_random_uuid(), ${conversationId}::uuid, ${viewerId}::uuid, ${body}, ${JSON.stringify(media)}::jsonb, now()
      WHERE EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = ${conversationId}::uuid AND user_id = ${viewerId}::uuid
      )
      RETURNING id, sender_id, body, media, created_at
    ), bump AS (
      UPDATE conversations SET last_message_at = now()
      WHERE id = ${conversationId}::uuid AND EXISTS (SELECT 1 FROM ins)
    )
    SELECT id, sender_id, body, media, created_at FROM ins
  `
  const msg = rows[0]
  if (!msg) throw new ForbiddenError("Not a participant")

  const view: MessageView = {
    id: msg.id, senderId: msg.sender_id, body: msg.body, media: msg.media,
    createdAt: msg.created_at.toISOString(), editedAt: null, deleted: false,
  }
  await broadcast(conversationId, "new_message", view)
  return view
}

async function assertAuthor(viewerId: string, messageId: string): Promise<{ conversationId: string }> {
  const m = await prisma.message.findUnique({ where: { id: messageId }, select: { senderId: true, conversationId: true } })
  if (!m || m.senderId !== viewerId) throw new ForbiddenError("Not the author")
  return { conversationId: m.conversationId }
}

export async function editMessage(viewerId: string, messageId: string, body: string): Promise<void> {
  const { conversationId } = await assertAuthor(viewerId, messageId)
  const trimmed = body.trim()
  if (!trimmed) throw new ForbiddenError("Empty message")
  if (trimmed.length > MAX_MESSAGE_LEN) throw new ForbiddenError("Message too long")
  const editedAt = new Date()
  await prisma.message.update({ where: { id: messageId }, data: { body: trimmed, editedAt } })
  await broadcast(conversationId, "edit", { id: messageId, body: trimmed, editedAt: editedAt.toISOString() })
}

export async function deleteMessage(viewerId: string, messageId: string): Promise<void> {
  const { conversationId } = await assertAuthor(viewerId, messageId)
  await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } })
  await broadcast(conversationId, "delete", { id: messageId })
}

export async function markRead(viewerId: string, conversationId: string): Promise<void> {
  await assertParticipant(viewerId, conversationId)
  const lastReadAt = new Date()
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    data: { lastReadAt },
  })
  await broadcast(conversationId, "read", { userId: viewerId, lastReadAt: lastReadAt.toISOString() })
}
