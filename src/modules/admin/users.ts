import { z } from "zod"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { audit } from "@/lib/audit"
import { createResetToken, resetUrl } from "@/lib/password-reset"
import { sendEmail } from "@/lib/email"
import { colorAvatar } from "@/lib/avatar"
import type { AdminRole } from "@/generated/prisma/enums"

// Actions an admin can take on a single user account.
export const USER_ACTIONS = [
  "verify",
  "unverify",
  "suspend",
  "activate",
  "ban",
  "reset-password",
  "delete",
  "set-role",
  "remove-role",
] as const
export type UserAction = (typeof USER_ACTIONS)[number]

// Actions that must never target your own account (locking yourself out /
// self-privilege games). Reset-password/verify on self are harmless.
const SELF_FORBIDDEN: ReadonlySet<UserAction> = new Set([
  "suspend",
  "ban",
  "delete",
  "remove-role",
])

export function isSelfForbidden(action: UserAction, actorId: string, targetId: string): boolean {
  return actorId === targetId && SELF_FORBIDDEN.has(action)
}

export interface ActOptions {
  role?: AdminRole // for set-role / remove-role
  ip?: string
}

/**
 * Apply an admin action to one user. Caller must have passed requireAdmin and
 * the self-guard (isSelfForbidden) already. Returns a short result label.
 */
export async function actOnUser(
  actorId: string,
  targetId: string,
  action: UserAction,
  opts: ActOptions = {},
): Promise<{ ok: true; action: UserAction }> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, legalName: true, deletedAt: true },
  })
  if (!target || target.deletedAt) throw new NotFoundError("User not found")

  switch (action) {
    case "verify":
      await prisma.user.update({
        where: { id: targetId },
        data: { isVerified: true, verificationStatus: "approved" },
      })
      break
    case "unverify":
      await prisma.user.update({
        where: { id: targetId },
        data: { isVerified: false, verificationStatus: "pending" },
      })
      break
    case "suspend":
      await prisma.user.update({ where: { id: targetId }, data: { status: "suspended" } })
      break
    case "activate":
      await prisma.user.update({ where: { id: targetId }, data: { status: "active" } })
      break
    case "ban":
      await prisma.user.update({ where: { id: targetId }, data: { status: "banned" } })
      break
    case "delete":
      // Soft delete — keeps FK integrity + audit trail. Deactivate so gates fail.
      await prisma.user.update({
        where: { id: targetId },
        data: { deletedAt: new Date(), status: "inactive" },
      })
      break
    case "reset-password": {
      const raw = await createResetToken(targetId, 60 * 24) // 24h
      await sendEmail(
        "password_reset",
        target.email,
        { legalName: target.legalName, resetUrl: resetUrl(raw), isNew: false },
        targetId,
      )
      break
    }
    case "set-role": {
      if (!opts.role) throw new BadActionError("role required")
      await prisma.userRole.upsert({
        where: { userId_role: { userId: targetId, role: opts.role } },
        update: { grantedBy: actorId },
        create: { userId: targetId, role: opts.role, grantedBy: actorId },
      })
      break
    }
    case "remove-role": {
      if (!opts.role) throw new BadActionError("role required")
      await prisma.userRole.deleteMany({ where: { userId: targetId, role: opts.role } })
      break
    }
  }

  await audit({
    actorId,
    action: `admin.user.${action}`,
    entityType: "user",
    entityId: targetId,
    payload: opts.role ? { role: opts.role } : {},
    ipInet: opts.ip,
  })

  return { ok: true, action }
}

export const MEMBERSHIP_TIERS = [
  "free", "student", "associate", "premium", "life", "committee", "inactive",
] as const

export const editUserSchema = z.object({
  legalName: z.string().min(1).max(160).optional(),
  displayName: z.string().max(160).nullable().optional(),
  email: z.string().email().max(254).optional(),
  membershipStatus: z.enum(MEMBERSHIP_TIERS).optional(),
  houseId: z.string().uuid().nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
})

export type EditUserInput = z.infer<typeof editUserSchema>

/**
 * Admin edit of a user's core fields + profile house/batch. Only provided keys
 * change. Email is normalised + uniqueness-checked. Audits the changed keys.
 */
export async function editUser(
  actorId: string,
  targetId: string,
  input: EditUserInput,
  ip?: string,
): Promise<{ ok: true }> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, deletedAt: true },
  })
  if (!target || target.deletedAt) throw new NotFoundError("User not found")

  const userData: Record<string, unknown> = {}
  if (input.legalName !== undefined) {
    const v = input.legalName.trim()
    if (!v) throw new BadActionError("legalName cannot be empty")
    userData.legalName = v
  }
  if (input.displayName !== undefined) userData.displayName = input.displayName?.trim() || null
  if (input.membershipStatus !== undefined) userData.membershipStatus = input.membershipStatus
  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase()
    if (!email) throw new BadActionError("email cannot be empty")
    const clash = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (clash && clash.id !== targetId) throw new BadActionError("Email already registered")
    userData.email = email
  }

  const profileData: Record<string, unknown> = {}
  if (input.houseId !== undefined) profileData.houseId = input.houseId || null
  if (input.batchId !== undefined) profileData.batchId = input.batchId || null

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userData).length) {
      await tx.user.update({ where: { id: targetId }, data: userData })
    }
    if (Object.keys(profileData).length) {
      await tx.profile.upsert({
        where: { userId: targetId },
        update: profileData,
        create: { userId: targetId, ...profileData },
      })
    }
  })

  await audit({
    actorId,
    action: "admin.user.edit",
    entityType: "user",
    entityId: targetId,
    payload: { fields: [...Object.keys(userData), ...Object.keys(profileData)] },
    ipInet: ip,
  })

  return { ok: true }
}

// ── Username generation (shared by invite + CSV import) ──

const RESERVED = new Set([
  "feed", "directory", "connections", "business", "businesses", "events", "groups",
  "membership", "notifications", "settings", "compose", "messages", "network",
  "profile", "admin", "auth", "api", "onboarding", "companies",
])

export function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
  return base || `user-${Date.now().toString(36)}`
}

async function uniqueUsername(base: string): Promise<string> {
  if (!RESERVED.has(base) && !(await prisma.user.findUnique({ where: { username: base } }))) return base
  for (let i = 2; i < 100; i++) {
    const cand = `${base}-${i}`
    if (!(await prisma.user.findUnique({ where: { username: cand } }))) return cand
  }
  return `${base}-${Date.now().toString(36)}`
}

/**
 * Create a passwordless account and email an activation link. Shared by the
 * single Invite flow and CSV import. Throws BadActionError if the email exists.
 */
export async function createInvitedUser(legalName: string, email: string): Promise<{ userId: string; username: string }> {
  const normEmail = email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email: normEmail } })
  if (existing) throw new BadActionError("Email already registered")

  const username = await uniqueUsername(slugify(legalName))
  const user = await prisma.user.create({
    data: { legalName: legalName.trim(), email: normEmail, username, passwordHash: null, status: "active", onboardingStep: "profile" },
  })
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, photoUrl: colorAvatar(user.id) },
  })

  const raw = await createResetToken(user.id, 60 * 24 * 7)
  await sendEmail("password_reset", user.email, { legalName: user.legalName, resetUrl: resetUrl(raw), isNew: true }, user.id)

  return { userId: user.id, username }
}

// ── Manual karma adjustment (admin override — bypasses caps/guards) ──

export const adjustKarmaSchema = z.object({
  delta: z.number().int().refine((n) => n !== 0, "delta cannot be zero").refine((n) => Math.abs(n) <= 100000, "delta too large"),
  reason: z.string().min(1).max(200),
})

export async function adminAdjustKarma(
  actorId: string,
  targetId: string,
  delta: number,
  reason: string,
  ip?: string,
): Promise<{ balance: number }> {
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, deletedAt: true } })
  if (!target || target.deletedAt) throw new NotFoundError("User not found")

  const d = new Prisma.Decimal(delta)
  const balance = await prisma.$transaction(async (tx) => {
    await tx.karmaTransaction.create({
      data: {
        userId: targetId,
        role: "self",
        actionType: "admin_adjust",
        baseValue: d,
        appliedValue: d,
        reasonCode: reason.slice(0, 40),
      },
    })
    const row = await tx.userKarma.upsert({
      where: { userId: targetId },
      update: { karmaBalance: { increment: d } },
      create: { userId: targetId, karmaBalance: d },
      select: { karmaBalance: true },
    })
    return row.karmaBalance.toNumber()
  })

  await audit({
    actorId, action: "admin.user.karma_adjust", entityType: "user", entityId: targetId,
    payload: { delta, reason, balance }, ipInet: ip,
  })
  return { balance }
}

export interface KarmaHistoryRow {
  id: string
  actionType: string
  applied: number
  reason: string | null
  at: string
}

export async function getKarmaHistory(userId: string, limit = 50): Promise<KarmaHistoryRow[]> {
  const rows = await prisma.karmaTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, actionType: true, appliedValue: true, reasonCode: true, createdAt: true },
  })
  return rows.map((r) => ({
    id: r.id,
    actionType: r.actionType,
    applied: r.appliedValue.toNumber(),
    reason: r.reasonCode,
    at: r.createdAt.toISOString(),
  }))
}

// ── Badge assignment ──

export async function setBadge(
  actorId: string,
  userId: string,
  badgeId: string,
  add: boolean,
  ip?: string,
): Promise<{ ok: true }> {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, deletedAt: true } })
  if (!target || target.deletedAt) throw new NotFoundError("User not found")

  if (add) {
    const badge = await prisma.badge.findUnique({ where: { id: badgeId }, select: { id: true } })
    if (!badge) throw new BadActionError("Badge not found")
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId } },
      update: {},
      create: { userId, badgeId, source: "manual" },
    })
  } else {
    await prisma.userBadge.deleteMany({ where: { userId, badgeId } })
  }

  await audit({
    actorId, action: add ? "admin.user.badge_add" : "admin.user.badge_remove",
    entityType: "user", entityId: userId, payload: { badgeId }, ipInet: ip,
  })
  return { ok: true }
}

// ── CSV import ──

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ParsedUserRow { legalName: string; email: string }
export interface ParsedCsv { rows: ParsedUserRow[]; errors: string[] }

/**
 * Parse a two-column CSV of alumni to invite. Accepts `name,email` in either
 * order (detected per row by which cell is an email). A header row is skipped
 * if it has no email cell. Blank lines ignored.
 *
 * ponytail: naive comma split — no quoted-field / embedded-comma support.
 * Upgrade to a real CSV parser if names with commas show up.
 */
export function parseUserCsv(text: string): ParsedCsv {
  const rows: ParsedUserRow[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  const lines = text.split(/\r?\n/)

  lines.forEach((line, i) => {
    const raw = line.trim()
    if (!raw) return
    const cells = raw.split(",").map((c) => c.trim())
    const emailCell = cells.find((c) => EMAIL_RE.test(c))
    // Header / no-email line: skip silently only if it looks like a header.
    if (!emailCell) {
      if (i === 0 && /email/i.test(raw)) return
      errors.push(`Line ${i + 1}: no valid email`)
      return
    }
    const email = emailCell.toLowerCase()
    const legalName = cells.filter((c) => c !== emailCell).join(" ").trim()
    if (!legalName) {
      errors.push(`Line ${i + 1}: missing name`)
      return
    }
    if (seen.has(email)) {
      errors.push(`Line ${i + 1}: duplicate ${email} in file`)
      return
    }
    seen.add(email)
    rows.push({ legalName, email })
  })

  return { rows, errors }
}

export interface ImportResult {
  created: number
  skipped: number
  failed: number
  errors: string[]
}

/** Invite each parsed row; skip emails already registered. */
export async function importUsers(actorId: string, rows: ParsedUserRow[], ip?: string): Promise<ImportResult> {
  let created = 0, skipped = 0, failed = 0
  const errors: string[] = []
  for (const r of rows) {
    try {
      await createInvitedUser(r.legalName, r.email)
      created++
    } catch (e) {
      if (e instanceof BadActionError) { skipped++; continue } // already registered
      failed++
      errors.push(`${r.email}: ${e instanceof Error ? e.message : "failed"}`)
    }
  }
  await audit({
    actorId, action: "admin.user.import", entityType: "user",
    payload: { requested: rows.length, created, skipped, failed }, ipInet: ip,
  })
  return { created, skipped, failed, errors }
}

export class NotFoundError extends Error {}
export class BadActionError extends Error {}
