import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import { ForbiddenError } from "@/lib/errors"
import { isOurPublicUrl } from "@/lib/supabase-storage"
import { broadcast } from "@/lib/supabase-realtime"
import { sendEmail } from "@/lib/email"
import { nextReaction } from "./reactions"
import { isBlockedBetween, blockUser as blockUserCanonical } from "@/modules/connections/blocks"
import type { ConversationSummary, MessageView, ReplyStub } from "./types"

export { unblockUser } from "@/modules/connections/blocks"

const MAX_MESSAGE_LEN = 5000

export function dmKeyFor(a: string, b: string): string {
  return [a, b].sort().join(":")
}

/** A chat is hidden ("deleted") for a viewer when they cleared it and nothing
 *  has arrived since. A newer message (equal timestamp doesn't count) reveals it. */
export function isChatHidden(clearedAt: Date | null, lastMessageAt: Date | null): boolean {
  return !!(clearedAt && lastMessageAt && lastMessageAt <= clearedAt)
}

export async function canMessage(viewerId: string, otherId: string): Promise<boolean> {
  if (viewerId === otherId) return false
  if (await isBlockedBetween(viewerId, otherId)) return false
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
        select: { userId: true, lastReadAt: true, muted: true, clearedAt: true, user: { select: { id: true, displayName: true, legalName: true, username: true, isVerified: true, membershipStatus: true, profile: { select: { photoUrl: true } } } } },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1, where: { deletedAt: null }, select: { body: true, media: true } },
    },
  })
  // Unread badges for ALL conversations in one query instead of one
  // message.count() per row (the old N+1). Each conversation's cutoff differs
  // (participant.lastReadAt), which groupBy can't express, so this joins the
  // viewer's participant row for the per-conversation cutoff. Backed by the
  // messages(conversation_id, created_at) index.
  const convIds = rows.map((c) => c.id)
  const unreadRows = convIds.length
    ? await prisma.$queryRaw<{ conversation_id: string; unread: number }[]>`
        SELECT m.conversation_id, count(*)::int AS unread
        FROM messages m
        JOIN conversation_participants cp
          ON cp.conversation_id = m.conversation_id AND cp.user_id = ${viewerId}::uuid
        WHERE m.conversation_id = ANY(${convIds}::uuid[])
          AND m.deleted_at IS NULL
          AND m.sender_id <> ${viewerId}::uuid
          AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
        GROUP BY m.conversation_id`
    : []
  const unreadByConv = new Map(unreadRows.map((r) => [r.conversation_id, Number(r.unread)]))

  return rows.map((c) => {
    const me = c.participants.find((p) => p.userId === viewerId)!
    // "Deleted" the chat and nothing new since → mark hidden (not dropped) so the
    // client keeps its Realtime subscription and the peer's next message can
    // reveal it instantly instead of waiting for the 60s safety poll.
    const hidden = isChatHidden(me.clearedAt, c.lastMessageAt)
    const other = c.participants.find((p) => p.userId !== viewerId)!.user
    const last = c.messages[0]
    return {
      id: c.id,
      otherUser: { id: other.id, name: other.displayName || other.legalName, username: other.username, avatar: other.profile?.photoUrl ?? null, isVerified: other.isVerified, membership: other.membershipStatus },
      lastMessagePreview: last ? last.body || ((last.media as string[]).length ? "📷 Photo" : "") : "",
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      unreadCount: hidden ? 0 : unreadByConv.get(c.id) ?? 0,
      muted: me.muted,
      ...(hidden ? { hidden: true } : {}),
    } satisfies ConversationSummary
  })
}

/** Total unread DM count across all the viewer's chats — feeds the navbar badge.
 *  Excludes messages the viewer has read (lastReadAt) or cleared away (clearedAt).
 *  Redis-first: cached counter avoids the raw SQL join on every navbar render. */
export async function totalUnread(viewerId: string): Promise<number> {
  try {
    const cached = await redis.get<number>(`msg:unread:${viewerId}`)
    if (cached !== null && cached !== undefined) return Math.max(0, cached)
  } catch {}
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n
    FROM messages m
    JOIN conversation_participants cp
      ON cp.conversation_id = m.conversation_id AND cp.user_id = ${viewerId}::uuid
    WHERE m.deleted_at IS NULL
      AND m.sender_id <> ${viewerId}::uuid
      AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      AND (cp.cleared_at IS NULL OR m.created_at > cp.cleared_at)`
  const count = Number(rows[0]?.n ?? 0)
  try { await redis.set(`msg:unread:${viewerId}`, count, { ex: 300 }) } catch {}
  return count
}

export async function getConversationMeta(
  viewerId: string,
  conversationId: string,
): Promise<{
  otherUser: { id: string; name: string; username: string | null; avatar: string | null; isVerified: boolean; membership: string; headline: string | null }
  otherLastReadAt: string | null
  muted: boolean
  blocked: boolean
}> {
  await assertParticipant(viewerId, conversationId)
  const [me, other] = await Promise.all([
    prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: viewerId } },
      select: { muted: true },
    }),
    prisma.conversationParticipant.findFirstOrThrow({
      where: { conversationId, userId: { not: viewerId } },
      select: {
        lastReadAt: true,
        user: { select: { id: true, displayName: true, legalName: true, username: true, isVerified: true, membershipStatus: true, profile: { select: { photoUrl: true, headline: true } } } },
      },
    }),
  ])
  const blocked =
    (await prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: viewerId, blockedId: other.user.id } },
      select: { blockerId: true },
    })) !== null
  return {
    otherUser: {
      id: other.user.id,
      name: other.user.displayName || other.user.legalName,
      username: other.user.username,
      avatar: other.user.profile?.photoUrl ?? null,
      isVerified: other.user.isVerified,
      membership: other.user.membershipStatus,
      headline: other.user.profile?.headline ?? null,
    },
    otherLastReadAt: other.lastReadAt?.toISOString() ?? null,
    muted: me?.muted ?? false,
    blocked,
  }
}

function toReplyStub(r: { id: string; senderId: string; body: string; deletedAt: Date | null } | null): ReplyStub | null {
  if (!r) return null
  return { id: r.id, senderId: r.senderId, body: r.deletedAt ? "" : r.body, deleted: !!r.deletedAt }
}

export async function getMessages(
  viewerId: string,
  conversationId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<MessageView[]> {
  await assertParticipant(viewerId, conversationId)
  const me = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    select: { clearedAt: true },
  })
  const limit = Math.min(opts.limit ?? 50, 100)
  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      ...(opts.before ? { createdAt: { lt: new Date(opts.before) } } : {}),
      // Respect this participant's "delete chat" — only show messages after it.
      ...(me?.clearedAt ? { createdAt: { gt: me.clearedAt } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, senderId: true, body: true, media: true, createdAt: true, editedAt: true, deletedAt: true,
      reactions: { select: { emoji: true, userId: true } },
      replyTo: { select: { id: true, senderId: true, body: true, deletedAt: true } },
    },
  })
  return rows.reverse().map((m) => ({
    id: m.id, senderId: m.senderId,
    body: m.deletedAt ? "" : m.body,
    media: m.deletedAt ? [] : (m.media as string[]),
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    deleted: !!m.deletedAt,
    reactions: m.deletedAt ? [] : m.reactions.map((r) => ({ emoji: r.emoji, userId: r.userId })),
    replyTo: toReplyStub(m.replyTo),
  }))
}

export async function sendMessage(
  viewerId: string,
  conversationId: string,
  input: { body: string; media?: string[]; replyToId?: string; clientMsgId?: string },
): Promise<MessageView> {
  const body = input.body.trim()
  // Idempotency (audit P1-16): a double-tap on a flaky connection used to insert
  // two messages. A client-supplied key dedupes — if we already stored one for
  // this (conversation, key), return it instead of inserting again.
  const clientMsgId = input.clientMsgId?.slice(0, 64) || null
  if (clientMsgId) {
    const dupe = await prisma.message.findUnique({
      where: { conversationId_clientMsgId: { conversationId, clientMsgId } },
      select: { id: true, senderId: true, body: true, media: true, createdAt: true, editedAt: true, deletedAt: true },
    })
    if (dupe) {
      return {
        id: dupe.id, senderId: dupe.senderId, body: dupe.body, media: dupe.media as string[],
        createdAt: dupe.createdAt.toISOString(), editedAt: dupe.editedAt?.toISOString() ?? null,
        deleted: !!dupe.deletedAt, reactions: [], replyTo: null,
      }
    }
  }
  if (body.length > MAX_MESSAGE_LEN) throw new ForbiddenError("Message too long")
  const media = input.media ?? []
  if (media.some((m) => !isOurPublicUrl(m))) throw new ForbiddenError("Invalid media URL")
  if (!body && media.length === 0) throw new ForbiddenError("Empty message")

  // A reply can only quote a message from the SAME conversation.
  let replyStub: ReplyStub | null = null
  if (input.replyToId) {
    const parent = await prisma.message.findUnique({
      where: { id: input.replyToId },
      select: { id: true, conversationId: true, senderId: true, body: true, deletedAt: true },
    })
    if (!parent || parent.conversationId !== conversationId) throw new ForbiddenError("Invalid reply target")
    replyStub = toReplyStub(parent)
  }

  // One roundtrip instead of five (participant check + BEGIN + insert + update +
  // COMMIT). Over a pooled remote Postgres that was the bulk of send latency.
  // The insert is gated on participation, so a non-participant inserts 0 rows.
  const rows = await prisma.$queryRaw<
    { id: string; sender_id: string; body: string; media: string[]; created_at: Date }[]
  >`
    WITH ins AS (
      INSERT INTO messages (id, conversation_id, sender_id, body, media, client_msg_id, reply_to_id, created_at)
      SELECT gen_random_uuid(), ${conversationId}::uuid, ${viewerId}::uuid, ${body}, ${JSON.stringify(media)}::jsonb, ${clientMsgId}, ${input.replyToId ?? null}::uuid, now()
      WHERE EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = ${conversationId}::uuid AND user_id = ${viewerId}::uuid
      )
      ON CONFLICT (conversation_id, client_msg_id) DO NOTHING
      RETURNING id, sender_id, body, media, created_at
    ), bump AS (
      UPDATE conversations SET last_message_at = now()
      WHERE id = ${conversationId}::uuid AND EXISTS (SELECT 1 FROM ins)
    )
    SELECT id, sender_id, body, media, created_at FROM ins
  `
  let msg = rows[0]
  if (!msg) {
    // 0 rows means either a not-a-participant insert OR a lost idempotency race
    // (a concurrent identical send won the unique key). Disambiguate by re-reading
    // the stored row for this key before rejecting.
    if (clientMsgId) {
      const raced = await prisma.message.findUnique({
        where: { conversationId_clientMsgId: { conversationId, clientMsgId } },
        select: { id: true, senderId: true, body: true, media: true, createdAt: true },
      })
      if (raced) {
        msg = { id: raced.id, sender_id: raced.senderId, body: raced.body, media: raced.media as string[], created_at: raced.createdAt }
      }
    }
    if (!msg) throw new ForbiddenError("Not a participant")
  }

  const view: MessageView = {
    id: msg.id, senderId: msg.sender_id, body: msg.body, media: msg.media,
    createdAt: msg.created_at.toISOString(), editedAt: null, deleted: false,
    reactions: [], replyTo: replyStub,
  }
  await broadcast(conversationId, "new_message", view)
  // Bump Redis unread counter for all OTHER participants
  try {
    const parts = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: viewerId } },
      select: { userId: true },
    })
    await Promise.all(parts.map((p) => redis.incr(`msg:unread:${p.userId}`)))
  } catch {}
  // No notification-bell row for DMs — messages surface in the messages inbox
  // (its own unread badge + realtime sidebar). Instead, a LinkedIn/Instagram-
  // style "you have a message" email brings the recipient back to the site.
  void emailNewMessage(conversationId, viewerId)
  return view
}

/**
 * LinkedIn/Instagram-style DM email — shows only WHO messaged (no content), so
 * the recipient must return to the site to read it. Throttled to the FIRST
 * unread message of a streak (one email per "you have unread messages", not per
 * message): if the recipient already had unread messages here, we've already
 * emailed them, so we skip. Best-effort; never blocks the send.
 */
async function emailNewMessage(conversationId: string, senderId: string) {
  try {
    const [sender, participants] = await Promise.all([
      prisma.user.findUnique({ where: { id: senderId }, select: { displayName: true, legalName: true } }),
      prisma.conversationParticipant.findMany({
        where: { conversationId, userId: { not: senderId }, muted: false },
        select: { userId: true, lastReadAt: true, user: { select: { email: true } } },
      }),
    ])
    if (!sender) return
    const fromName = sender.displayName || sender.legalName
    const base = process.env.AUTH_URL || "https://nnawca.org"
    const messagesUrl = `${base}/messages/${conversationId}`
    await Promise.all(
      participants.map(async (p) => {
        if (!p.user.email) return
        // Count this recipient's unread messages (incl. the one just sent). If
        // it's exactly 1, this is the first unread → email. More than 1 means
        // they were already unread (already emailed) → stay quiet.
        const unread = await prisma.message.count({
          where: {
            conversationId,
            senderId: { not: p.userId },
            deletedAt: null,
            ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
          },
        })
        if (unread > 1) return
        await sendEmail("new_message", p.user.email, { fromName, messagesUrl }, p.userId)
      }),
    )
  } catch (e) {
    console.error("new message email failed:", e)
  }
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

/**
 * Toggle the viewer's reaction on a message. Tapping the same emoji removes it,
 * a different emoji replaces it. Both sides get a "reaction" broadcast.
 */
export async function toggleReaction(viewerId: string, messageId: string, emoji: string): Promise<void> {
  const trimmed = emoji.trim()
  if (!trimmed || trimmed.length > 16) throw new ForbiddenError("Invalid reaction")
  const m = await prisma.message.findUnique({ where: { id: messageId }, select: { conversationId: true, deletedAt: true } })
  if (!m || m.deletedAt) throw new ForbiddenError("Message not found")
  await assertParticipant(viewerId, m.conversationId)

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId: { messageId, userId: viewerId } },
    select: { emoji: true },
  })
  const { removed } = nextReaction(existing?.emoji ?? null, trimmed)
  if (removed) {
    await prisma.messageReaction.delete({ where: { messageId_userId: { messageId, userId: viewerId } } })
  } else {
    await prisma.messageReaction.upsert({
      where: { messageId_userId: { messageId, userId: viewerId } },
      create: { messageId, userId: viewerId, emoji: trimmed },
      update: { emoji: trimmed },
    })
  }
  await broadcast(m.conversationId, "reaction", { messageId, userId: viewerId, emoji: trimmed, removed })
}

export async function setMuted(viewerId: string, conversationId: string, muted: boolean): Promise<void> {
  await assertParticipant(viewerId, conversationId)
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    data: { muted },
  })
}

/** "Delete chat" — hides history from this participant up to now. */
export async function clearConversation(viewerId: string, conversationId: string): Promise<void> {
  await assertParticipant(viewerId, conversationId)
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    data: { clearedAt: new Date() },
  })
}

export async function blockUser(viewerId: string, otherId: string): Promise<void> {
  await blockUserCanonical(viewerId, otherId)
}

export async function reportUser(viewerId: string, otherId: string, reason: string): Promise<void> {
  if (viewerId === otherId) throw new ForbiddenError("Cannot report yourself")
  const trimmed = (reason || "other").slice(0, 40)
  // entityType "profile" (not "user") so the moderation queue can resolve it and
  // apply a consequence — resolveEntityAuthor + applyModerationConsequence both
  // handle "profile" (audit P0-5).
  await prisma.contentReport.upsert({
    where: { reporterId_entityType_entityId: { reporterId: viewerId, entityType: "profile", entityId: otherId } },
    create: { reporterId: viewerId, entityType: "profile", entityId: otherId, reason: trimmed },
    update: { reason: trimmed },
  })
}

export async function markRead(viewerId: string, conversationId: string): Promise<void> {
  await assertParticipant(viewerId, conversationId)
  const lastReadAt = new Date()
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    data: { lastReadAt },
  })
  // Invalidate cached total so next navbar render re-computes from DB
  try { await redis.del(`msg:unread:${viewerId}`) } catch {}
  await broadcast(conversationId, "read", { userId: viewerId, lastReadAt: lastReadAt.toISOString() })
}
