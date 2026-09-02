"use server"

import { requireUser } from "@/modules/auth/session"
import * as svc from "@/modules/messaging/service"
import { signRealtimeToken } from "@/lib/supabase-realtime"
import { enforceRateLimit } from "@/lib/rate-limit"
import type { ConversationSummary, MessageView } from "@/modules/messaging/types"

export async function realtimeTokenAction(): Promise<{ token: string; userId: string } | null> {
  try {
    const u = await requireUser()
    return { token: signRealtimeToken(u.id), userId: u.id }
  } catch {
    return null
  }
}

export async function startConversationAction(otherId: string) {
  const u = await requireUser()
  try {
    // Anti-spam: cap how many fresh conversations one user can open per hour so a
    // member can't mass-DM everyone they follow. Existing conversations are unaffected.
    await enforceRateLimit({ bucket: "dm.start", identifier: u.id, limit: 20, windowSec: 3600 })
    const { id } = await svc.findOrCreateConversation(u.id, otherId)
    return { ok: true as const, conversationId: id }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function sendMessageAction(conversationId: string, body: string, media: string[] = [], replyToId?: string, clientMsgId?: string) {
  const u = await requireUser()
  try {
    // Anti-spam send throttle. Generous for real chat (a burst of 40/min is well
    // above human typing) but stops automated flooding — the one comms path that
    // previously had no limiter.
    await enforceRateLimit({ bucket: "dm.send", identifier: u.id, limit: 40, windowSec: 60 })
    const msg = await svc.sendMessage(u.id, conversationId, { body, media, replyToId, clientMsgId })
    return { ok: true as const, msg }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function toggleReactionAction(messageId: string, emoji: string) {
  const u = await requireUser()
  try {
    await svc.toggleReaction(u.id, messageId, emoji)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function setMutedAction(conversationId: string, muted: boolean) {
  const u = await requireUser()
  try {
    await svc.setMuted(u.id, conversationId, muted)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function clearConversationAction(conversationId: string) {
  const u = await requireUser()
  try {
    await svc.clearConversation(u.id, conversationId)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function blockUserAction(otherId: string) {
  const u = await requireUser()
  try {
    await svc.blockUser(u.id, otherId)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function unblockUserAction(otherId: string) {
  const u = await requireUser()
  try {
    await svc.unblockUser(u.id, otherId)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function reportUserAction(otherId: string, reason: string) {
  const u = await requireUser()
  try {
    await svc.reportUser(u.id, otherId, reason)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function editMessageAction(messageId: string, body: string) {
  const u = await requireUser()
  try {
    await svc.editMessage(u.id, messageId, body)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function deleteMessageAction(messageId: string) {
  const u = await requireUser()
  try {
    await svc.deleteMessage(u.id, messageId)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function markReadAction(conversationId: string) {
  const u = await requireUser()
  try {
    await svc.markRead(u.id, conversationId)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function refreshMessagesAction(conversationId: string, before?: string): Promise<MessageView[]> {
  try {
    const u = await requireUser()
    return await svc.getMessages(u.id, conversationId, { before })
  } catch {
    return []
  }
}

export async function conversationMetaAction(conversationId: string) {
  const u = await requireUser()
  try {
    const meta = await svc.getConversationMeta(u.id, conversationId)
    return { ok: true as const, meta }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function refreshConversationsAction(): Promise<ConversationSummary[]> {
  try {
    const u = await requireUser()
    return await svc.listConversations(u.id)
  } catch {
    return []
  }
}
