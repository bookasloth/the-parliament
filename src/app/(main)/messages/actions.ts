"use server"

import { requireUser } from "@/modules/auth/session"
import * as svc from "@/modules/messaging/service"
import type { ConversationSummary, MessageView } from "@/modules/messaging/types"

export async function startConversationAction(otherId: string) {
  const u = await requireUser()
  try {
    const { id } = await svc.findOrCreateConversation(u.id, otherId)
    return { ok: true as const, conversationId: id }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function sendMessageAction(conversationId: string, body: string, media: string[] = []) {
  const u = await requireUser()
  try {
    const msg = await svc.sendMessage(u.id, conversationId, { body, media })
    return { ok: true as const, msg }
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
