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
  marketing: "marketing",
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
  marketing: "NNAWCA Community <community@nnawca.com>",
}

// Re-engagement mail budget: at most this many of the CAPPED_CATEGORIES per
// user per rolling 24h (the 1–4/day ceiling). Transactional / admin /
// institutional mail is exempt (operational, must always send).
const DAILY_CAP = 4
const CAPPED_CATEGORIES = new Set<EmailCategory>([
  "engagement",
  "digest",
  "reminder",
  "wish",
  "marketing",
  "lifecycle",
])

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

/** Build the nodemailer payload for a message. Pure — shared by the inline send
 *  in deliver() and the outbox drain, so header/from logic lives in one place. */
export function buildMailPayload(m: {
  category: EmailCategory
  toAddress: string
  subject: string
  text: string
  html: string
  unsubscribeToken?: string
}) {
  return {
    // The SMTP mailbox can only send as its own domain — sending as an
    // unowned domain (e.g. @nnawca.com) is rejected ("Sender address
    // rejected: Domain not found"). Prefer the authenticated SMTP_FROM; fall
    // back to the per-category address only when SMTP_FROM isn't configured.
    from: process.env.SMTP_FROM || FROM_BY_CATEGORY[m.category],
    to: m.toAddress,
    subject: m.subject,
    text: m.text,
    html: m.html,
    headers:
      m.category !== "transactional"
        ? {
            "List-Unsubscribe": `<mailto:unsubscribe@nnawca.com?subject=unsubscribe-${m.category}>, <${process.env.AUTH_URL || ""}/api/email/unsubscribe?token=${m.unsubscribeToken ?? ""}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : undefined,
  }
}

// The single guarded send path. Every email — DB-template (queueEmail) OR
// code-template (lib/email sendEmail) — goes through here, so suppression,
// per-user opt-out, quiet-hours deferral and EmailMessage logging are enforced
// once, in one place. Callers pass pre-rendered subject/text/html.
export interface DeliverArgs {
  toAddress: string
  userId?: string
  category: EmailCategory
  subject: string
  text: string
  html: string
  /** Template code for logging; defaults to "adhoc". */
  templateCode?: string
  /** Stored on the EmailMessage for debugging/resend. */
  variables?: Record<string, string>
  bypassQuietHours?: boolean
  /** One-click unsubscribe token for the List-Unsubscribe header. */
  unsubscribeToken?: string
}

export async function deliver(args: DeliverArgs): Promise<{ messageId: string | null; reason?: string }> {
  const to = args.toAddress.toLowerCase()
  const code = args.templateCode ?? "adhoc"

  // 1. Suppression — applies to EVERY category, including transactional.
  const suppressed = await prisma.emailSuppression.findUnique({ where: { emailAddress: to } })
  if (suppressed) return { messageId: null, reason: "suppressed" }

  // 2. Per-user opt-out. Transactional maps to the always-on "transactional"
  //    flag, so account/security mail can't be blocked here.
  if (args.userId) {
    const prefs = await prisma.emailPreference.findUnique({ where: { userId: args.userId } })
    const flags: PreferenceFlags = prefs ?? defaultPreferences()
    if (!flags[CATEGORY_PREF_MAP[args.category]]) return { messageId: null, reason: "opted_out" }
  }

  // 2.5. Frequency cap — at most DAILY_CAP re-engagement emails per user per
  //   rolling 24h. Message/follow/digest/profile-view mail can otherwise pile up
  //   on an active day and tip a user into spam-marking, wrecking deliverability
  //   for everyone. Only CAPPED_CATEGORIES count toward (and are limited by) the
  //   budget — transactional/admin/institutional mail is never capped. The
  //   digest is the floor, this is the ceiling → the 1–4/day target.
  if (args.userId && CAPPED_CATEGORIES.has(args.category)) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recent = await prisma.emailMessage.count({
      where: { userId: args.userId, category: { in: [...CAPPED_CATEGORIES] }, queuedAt: { gte: since } },
    })
    if (recent >= DAILY_CAP) return { messageId: null, reason: "daily_cap" }
  }

  // 3. Quiet hours — defer non-transactional mail sent overnight (IST).
  if (!args.bypassQuietHours && args.category !== "transactional" && insideQuietHours()) {
    const deferred = await prisma.emailMessage.create({
      data: {
        userId: args.userId,
        toAddress: to,
        templateCode: code,
        category: args.category,
        subject: args.subject,
        status: "queued",
        // Store the rendered body so the outbox drain can send it later without
        // re-rendering. Without this, a deferred row can never be delivered.
        metadata: {
          quietHoursDeferred: true,
          variables: args.variables ?? {},
          html: args.html,
          text: args.text,
          unsubscribeToken: args.unsubscribeToken ?? "",
        } as Prisma.InputJsonValue,
      },
    })
    return { messageId: deferred.id, reason: "quiet_hours_deferred" }
  }

  // 4. Log, then send.
  const message = await prisma.emailMessage.create({
    data: {
      userId: args.userId,
      toAddress: to,
      templateCode: code,
      category: args.category,
      subject: args.subject,
      status: "queued",
      metadata: { variables: args.variables ?? {} } as Prisma.InputJsonValue,
    },
  })

  if (!process.env.SMTP_HOST) {
    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: "sent", sentAt: new Date(), providerMsgId: "dev-noop" },
    })
    console.log(`[email:dev] ${code} -> ${to}`)
    return { messageId: message.id }
  }

  try {
    const info = await getTransport().sendMail(
      buildMailPayload({
        category: args.category,
        toAddress: args.toAddress,
        subject: args.subject,
        text: args.text,
        html: args.html,
        unsubscribeToken: args.unsubscribeToken,
      }),
    )
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

/**
 * Send the queued outbox — mail deferred by quiet hours (and any future
 * enqueue-for-later senders). Runs from a Vercel Cron. Only sends outside quiet
 * hours (so it doesn't undo the deferral), re-checks suppression at send time,
 * and skips legacy rows that predate body storage (they have no html/text to
 * replay). Best-effort per row: one failure doesn't block the rest.
 */
export async function drainEmailOutbox(limit = 200): Promise<{ sent: number; failed: number; skipped: number }> {
  if (insideQuietHours()) return { sent: 0, failed: 0, skipped: 0 }

  const rows = await prisma.emailMessage.findMany({
    where: { status: "queued" },
    orderBy: { queuedAt: "asc" },
    take: limit,
  })

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const row of rows) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const html = typeof meta.html === "string" ? meta.html : undefined
    const text = typeof meta.text === "string" ? meta.text : undefined
    if (!html && !text) {
      skipped++
      continue // legacy queued row with no stored body — can't be replayed
    }

    const suppressed = await prisma.emailSuppression.findUnique({ where: { emailAddress: row.toAddress } })
    if (suppressed) {
      await prisma.emailMessage.update({ where: { id: row.id }, data: { status: "failed", error: "suppressed" } })
      skipped++
      continue
    }

    if (!process.env.SMTP_HOST) {
      await prisma.emailMessage.update({
        where: { id: row.id },
        data: { status: "sent", sentAt: new Date(), providerMsgId: "dev-noop" },
      })
      sent++
      continue
    }

    try {
      const info = await getTransport().sendMail(
        buildMailPayload({
          category: row.category as EmailCategory,
          toAddress: row.toAddress,
          subject: row.subject,
          text: text ?? "",
          html: html ?? "",
          unsubscribeToken: typeof meta.unsubscribeToken === "string" ? meta.unsubscribeToken : undefined,
        }),
      )
      await prisma.emailMessage.update({
        where: { id: row.id },
        data: { status: "sent", sentAt: new Date(), providerMsgId: info.messageId ?? null },
      })
      sent++
    } catch (e) {
      const errMsg = (e as Error).message
      await prisma.emailMessage.update({ where: { id: row.id }, data: { status: "failed", error: errMsg } })
      await audit({ action: "email.drain.failed", entityId: row.id, payload: { error: errMsg } })
      failed++
    }
  }

  return { sent, failed, skipped }
}

/** DB-template send: look up + fill the template, then hand off to deliver(). */
export async function queueEmail(args: SendArgs): Promise<{ messageId: string | null; reason?: string }> {
  const template = await prisma.emailTemplate.findUnique({ where: { code: args.templateCode } })
  if (!template || !template.isActive) {
    return { messageId: null, reason: "template_inactive" }
  }
  const category = template.category as EmailCategory
  return deliver({
    toAddress: args.toAddress,
    userId: args.userId,
    category,
    templateCode: template.code,
    subject: fillVars(template.subject, args.variables),
    text: fillVars(template.textBody, args.variables),
    html: fillVars(template.htmlBody, withUnsubscribe(args.variables, args.userId, category)),
    variables: args.variables,
    bypassQuietHours: args.bypassQuietHours,
    unsubscribeToken: args.variables.unsubscribeToken,
  })
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

