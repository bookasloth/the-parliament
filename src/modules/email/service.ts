import nodemailer from "nodemailer"
import crypto from "node:crypto"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { audit } from "@/lib/audit"
import type { EmailCategory } from "@/modules/email/templates"

export type SendArgs = {
  templateCode: string
  toAddress: string
  userId?: string
  variables: Record<string, string>
  bypassQuietHours?: boolean
}

const CATEGORY_PREF_MAP: Record<EmailCategory, keyof PreferenceFlags> = {
  transactional: "transactional",
  lifecycle: "lifecycle",
  reminder: "reminders",
  wish: "wishes",
  engagement: "engagement",
  digest: "digests",
  admin: "transactional",
  institutional: "lifecycle",
}

interface PreferenceFlags {
  transactional: boolean
  lifecycle: boolean
  reminders: boolean
  wishes: boolean
  festivalGreetings: boolean
  engagement: boolean
  digests: boolean
  marketing: boolean
}

const FROM_BY_CATEGORY: Record<EmailCategory, string> = {
  transactional: "NNAWCA <noreply@nnawca.com>",
  lifecycle: "NNAWCA Community <community@nnawca.com>",
  reminder: "NNAWCA <community@nnawca.com>",
  wish: "NNAWCA Community <community@nnawca.com>",
  engagement: "NNAWCA Community <community@nnawca.com>",
  digest: "NNAWCA Community <community@nnawca.com>",
  admin: "NNAWCA Admin <admin@nnawca.com>",
  institutional: "NNAWCA <community@nnawca.com>",
}

let cachedTransport: nodemailer.Transporter | null = null

function getTransport(): nodemailer.Transporter {
  if (cachedTransport) return cachedTransport
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: (process.env.SMTP_PORT || "465") === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  })
  return cachedTransport
}

export async function queueEmail(args: SendArgs): Promise<{ messageId: string | null; reason?: string }> {
  const template = await prisma.emailTemplate.findUnique({
    where: { code: args.templateCode },
  })
  if (!template || !template.isActive) {
    return { messageId: null, reason: "template_inactive" }
  }

  const category = template.category as EmailCategory
  const suppressed = await prisma.emailSuppression.findUnique({
    where: { emailAddress: args.toAddress.toLowerCase() },
  })
  if (suppressed) return { messageId: null, reason: "suppressed" }

  if (args.userId) {
    const prefs = await prisma.emailPreference.findUnique({ where: { userId: args.userId } })
    const flags: PreferenceFlags = prefs ?? defaultPreferences()
    const pref = CATEGORY_PREF_MAP[category]
    if (!flags[pref]) return { messageId: null, reason: "opted_out" }
  }

  if (!args.bypassQuietHours && category !== "transactional") {
    if (insideQuietHours()) {
      return scheduleForAfterQuiet(args, template)
    }
  }

  const filledSubject = fillVars(template.subject, args.variables)
  const filledText = fillVars(template.textBody, args.variables)
  const filledHtml = fillVars(template.htmlBody, withUnsubscribe(args.variables, args.userId, category))
  const from = FROM_BY_CATEGORY[category]

  const message = await prisma.emailMessage.create({
    data: {
      userId: args.userId,
      toAddress: args.toAddress.toLowerCase(),
      templateCode: template.code,
      category,
      subject: filledSubject,
      status: "queued",
      metadata: { variables: args.variables } as Prisma.InputJsonValue,
    },
  })

  if (!process.env.SMTP_HOST) {
    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: "sent", sentAt: new Date(), providerMsgId: "dev-noop" },
    })
    console.log(`[email:dev] ${template.code} -> ${args.toAddress}`)
    return { messageId: message.id }
  }

  try {
    const info = await getTransport().sendMail({
      from,
      to: args.toAddress,
      subject: filledSubject,
      text: filledText,
      html: filledHtml,
      headers: category !== "transactional"
        ? {
            "List-Unsubscribe": `<mailto:unsubscribe@nnawca.com?subject=unsubscribe-${category}>, <${process.env.AUTH_URL || ""}/api/email/unsubscribe?token=${args.variables.unsubscribeToken ?? ""}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : undefined,
    })

    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: "sent", sentAt: new Date(), providerMsgId: info.messageId ?? null },
    })
    return { messageId: message.id }
  } catch (e) {
    const errMsg = (e as Error).message
    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: "failed", error: errMsg },
    })
    await audit({ action: "email.send.failed", entityId: message.id, payload: { error: errMsg } })
    return { messageId: message.id, reason: "send_failed" }
  }
}

export async function suppress(emailAddress: string, reason: "hard_bounce" | "complaint" | "unsubscribe_all" | "invalid"): Promise<void> {
  await prisma.emailSuppression.upsert({
    where: { emailAddress: emailAddress.toLowerCase() },
    create: { emailAddress: emailAddress.toLowerCase(), reason },
    update: { reason },
  })
}

export async function generateUnsubscribeToken(userId: string, category: string, ttlDays = 30): Promise<string> {
  const token = crypto.randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + ttlDays * 86400000)
  await prisma.emailUnsubscribeToken.create({
    data: { token, userId, category, expiresAt },
  })
  return token
}

export async function consumeUnsubscribeToken(token: string): Promise<{ userId: string; category: string } | null> {
  const row = await prisma.emailUnsubscribeToken.findUnique({ where: { token } })
  if (!row || row.expiresAt < new Date()) return null
  await prisma.emailUnsubscribeToken.delete({ where: { token } })
  return { userId: row.userId, category: row.category }
}

export async function setOptOut(userId: string, category: string): Promise<void> {
  const update: Record<string, boolean> = {}
  if (category === "all") {
    Object.assign(update, {
      lifecycle: false, reminders: false, wishes: false, festivalGreetings: false,
      engagement: false, digests: false, marketing: false,
    })
  } else {
    update[category] = false
  }
  await prisma.emailPreference.upsert({
    where: { userId },
    create: { userId, ...update },
    update,
  })
}

function fillVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "")
}

function withUnsubscribe(vars: Record<string, string>, userId: string | undefined, category: EmailCategory): Record<string, string> {
  if (!userId || category === "transactional") return { ...vars, unsubscribeUrl: "" }
  return { ...vars, unsubscribeUrl: vars.unsubscribeUrl ?? `${process.env.AUTH_URL || ""}/settings/email` }
}

function defaultPreferences(): PreferenceFlags {
  return {
    transactional: true, lifecycle: true, reminders: true, wishes: true,
    festivalGreetings: true, engagement: true, digests: true, marketing: true,
  }
}

function insideQuietHours(now: Date = new Date()): boolean {
  const istHour = (now.getUTCHours() + 5 + (now.getUTCMinutes() + 30 >= 60 ? 1 : 0)) % 24
  return istHour >= 22 || istHour < 7
}

async function scheduleForAfterQuiet(
  args: SendArgs,
  template: { code: string; subject: string; category: string },
): Promise<{ messageId: string; reason: string }> {
  const message = await prisma.emailMessage.create({
    data: {
      userId: args.userId,
      toAddress: args.toAddress.toLowerCase(),
      templateCode: template.code,
      category: template.category,
      subject: template.subject,
      status: "queued",
      metadata: { quietHoursDeferred: true, variables: args.variables } as Prisma.InputJsonValue,
    },
  })
  return { messageId: message.id, reason: "quiet_hours_deferred" }
}
