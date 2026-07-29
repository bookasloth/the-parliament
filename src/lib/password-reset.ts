import crypto from "node:crypto"
import { prisma } from "@/lib/prisma"

const PURPOSE = "password_reset"

function hash(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

/** Create a single-use reset/set-password token. Returns the raw token (only
 *  the hash is stored). ttlMinutes: 60 for self-service resets, longer for the
 *  bulk activation blast. */
export async function createResetToken(userId: string, ttlMinutes = 60): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex")
  await prisma.verificationToken.create({
    data: {
      userId,
      purpose: PURPOSE,
      tokenHash: hash(raw),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    },
  })
  return raw
}

export function resetUrl(rawToken: string): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3000"
  return `${base.replace(/\/$/, "")}/auth/reset?token=${rawToken}`
}

/** Validate a raw token without consuming it (for the reset page to check up front). */
export async function findValidToken(rawToken: string): Promise<{ id: string; userId: string } | null> {
  if (!rawToken) return null
  const t = await prisma.verificationToken.findFirst({
    where: { tokenHash: hash(rawToken), purpose: PURPOSE, consumedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, userId: true },
  })
  return t
}

/** Consume the token and set the new password in one transaction. */
export async function resetPassword(rawToken: string, passwordHash: string): Promise<boolean> {
  const t = await findValidToken(rawToken)
  if (!t) return false
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: t.id }, data: { consumedAt: new Date() } }),
    // Invalidate any other outstanding reset tokens for this user.
    prisma.verificationToken.updateMany({
      where: { userId: t.userId, purpose: PURPOSE, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: t.userId },
      data: { passwordHash, emailVerifiedAt: new Date() },
    }),
  ])
  return true
}
