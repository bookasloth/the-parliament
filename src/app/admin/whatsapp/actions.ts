"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/gate"
import { enforceAdminRateLimit } from "@/modules/admin/rate-limit"
import { prisma } from "@/lib/prisma"
import { groupWhatsAppAudience, broadcastGroupWhatsApp, type BroadcastResult } from "@/modules/whatsapp/service"

export async function previewGroupAudienceAction(
  groupId: string,
): Promise<{ total: number; reachable: number }> {
  await requirePermission("whatsapp:send")
  if (!groupId) throw new Error("Pick a group")
  return groupWhatsAppAudience(groupId)
}

export interface SendWhatsAppInput {
  groupId: string
  campaignName: string
  templateParams: string[]
}

export async function sendGroupWhatsAppAction(
  input: SendWhatsAppInput,
): Promise<BroadcastResult> {
  const admin = await requirePermission("whatsapp:send")
  // Each broadcast fans out to many paid sends — keep the bucket tight.
  await enforceAdminRateLimit(admin.id, "whatsapp-broadcast", 10, 300)

  const groupId = input.groupId?.trim()
  const campaignName = input.campaignName?.trim()
  if (!groupId) throw new Error("Pick a group")
  if (!campaignName) throw new Error("Enter the AiSensy campaign name")

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true } })
  if (!group) throw new Error("Group not found")

  const templateParams = (input.templateParams ?? [])
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0)

  const result = await broadcastGroupWhatsApp({
    groupId,
    campaignName,
    templateParams,
    sentById: admin.id,
  })

  revalidatePath("/admin/whatsapp")
  return result
}
