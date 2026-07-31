import crypto from "node:crypto"
import { prisma } from "@/lib/prisma"

// Email-ownership verification for self-signups. Mirrors password-reset: a
// 256-bit random token, only its SHA-256 hash stored, single-use, time-boxed.
const PURPOSE = "email_verify"
const DEFAULT_TTL_MINUTES = 60 * 24 // 24h

function hash(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export async function createVerifyToken(userId: string, ttlMinutes = DEFAULT_TTL_MINUTES): Promise<string> {
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

export function verifyUrl(rawToken: string): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3000"
  return `${base.replace(/\/$/, "")}/auth/verify?token=${rawToken}`
}

/**
 * Consume a valid email-verification token: mark the email verified (and the
 * account active), single-use, invalidating any other outstanding verify tokens
 * for the user. Returns false for an unknown/expired/consumed token.
 */
export async function consumeVerifyToken(rawToken: string): Promise<boolean> {
  if (!rawToken) return false
  const t = await prisma.verificationToken.findFirst({
    where: { tokenHash: hash(rawToken), purpose: PURPOSE, consumedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, userId: true },
  })
  if (!t) return false
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: t.id }, data: { consumedAt: new Date() } }),
    prisma.verificationToken.updateMany({
      where: { userId: t.userId, purpose: PURPOSE, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: t.userId },
      data: { emailVerifiedAt: new Date(), status: "active" },
    }),
  ])
  return true
}
