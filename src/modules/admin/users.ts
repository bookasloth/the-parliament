import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { audit } from "@/lib/audit"
import { createResetToken, resetUrl } from "@/lib/password-reset"
import { sendEmail } from "@/lib/email"
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

export class NotFoundError extends Error {}
export class BadActionError extends Error {}
