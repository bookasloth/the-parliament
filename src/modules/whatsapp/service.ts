import { prisma } from "@/lib/prisma"
import { sendWhatsAppCampaign, normalizeWhatsAppDestination } from "@/lib/aisensy"

/**
 * Group → WhatsApp utility broadcast (AiSensy).
 *
 * Recipient set = a group's active members who have opted in to WhatsApp
 * (`Profile.whatsappOptIn`) and have a usable phone number. Sends an approved
 * utility template (referenced by `campaignName`) to each, one at a time with a
 * gentle throttle, and records an aggregate `WhatsAppBroadcast` audit row.
 */

export interface MemberContact {
  userId: string
  name: string
  phone: string | null
  whatsappOptIn: boolean
  status: string
}

export interface WhatsAppRecipient {
  userId: string
  name: string
  destination: string
}

/**
 * Pure eligibility filter: active + opted-in + valid WhatsApp number, deduped by
 * destination. Extracted from IO so it can be unit-tested without a DB.
 */
export function reachableRecipients(members: MemberContact[]): WhatsAppRecipient[] {
  const seen = new Set<string>()
  const out: WhatsAppRecipient[] = []
  for (const m of members) {
    if (m.status !== "active" || !m.whatsappOptIn) continue
    const destination = normalizeWhatsAppDestination(m.phone)
    if (!destination || seen.has(destination)) continue
    seen.add(destination)
    out.push({ userId: m.userId, name: m.name, destination })
  }
  return out
}

// ponytail: 5000-member cap per broadcast — a single-school base is well under
// this, and Vercel maxDuration bites first. Chunk + outbox if groups grow huge.
async function groupMemberContacts(groupId: string): Promise<MemberContact[]> {
  const rows = await prisma.groupMember.findMany({
    where: { groupId, status: "active" },
    take: 5000,
    select: {
      user: {
        select: {
          id: true,
          status: true,
          displayName: true,
          legalName: true,
          mobileE164: true,
          profile: { select: { whatsappOptIn: true } },
        },
      },
    },
  })
  return rows.map((r) => ({
    userId: r.user.id,
    name: r.user.displayName || r.user.legalName || "Member",
    phone: r.user.mobileE164,
    whatsappOptIn: r.user.profile?.whatsappOptIn ?? false,
    status: r.user.status,
  }))
}

/** Total active members vs how many are actually WhatsApp-reachable. */
export async function groupWhatsAppAudience(
  groupId: string,
): Promise<{ total: number; reachable: number }> {
  const contacts = await groupMemberContacts(groupId)
  return { total: contacts.length, reachable: reachableRecipients(contacts).length }
}

export interface BroadcastResult {
  recipientCount: number
  sent: number
  failed: number
  /** True if AiSensy is unconfigured — every send was skipped, not attempted. */
  skipped: boolean
}

export async function broadcastGroupWhatsApp(opts: {
  groupId: string
  campaignName: string
  templateParams?: string[]
  sentById: string
  source?: string
}): Promise<BroadcastResult> {
  const recipients = reachableRecipients(await groupMemberContacts(opts.groupId))

  let sent = 0
  let failed = 0
  let skipped = false
  for (const r of recipients) {
    const res = await sendWhatsAppCampaign({
      campaignName: opts.campaignName,
      destination: r.destination,
      userName: r.name,
      templateParams: opts.templateParams,
      source: opts.source ?? `group:${opts.groupId}`,
    })
    if (res.ok) {
      sent++
    } else {
      failed++
      if (res.skipped) skipped = true
    }
    await new Promise((res) => setTimeout(res, 200)) // gentle throttle
  }

  await prisma.whatsAppBroadcast.create({
    data: {
      campaignName: opts.campaignName,
      audience: "group",
      groupId: opts.groupId,
      templateParams: opts.templateParams ?? [],
      recipientCount: recipients.length,
      sentCount: sent,
      failedCount: failed,
      sentById: opts.sentById,
    },
  })

  return { recipientCount: recipients.length, sent, failed, skipped }
}
