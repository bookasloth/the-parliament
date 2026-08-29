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

// 6-char alphanumeric code alphabet — upper-case, ambiguous chars (I/O/0/1)
// removed so a code read off an email screen can't be mistyped. 32^6 ≈ 1.07e9
// combos; safe because the confirm endpoint scopes to one user + rate-limits.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** Cryptographically-random 6-char alphanumeric reset code (unbiased). */
export function generateCode(len = 6): string {
  let out = ""
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]
  return out
}

/** Create a single-use 6-char reset code. Returns the raw code (hash stored).
 *  Short TTL (15 min default) since the code is low-entropy vs a 32-byte token. */
export async function createResetCode(userId: string, ttlMinutes = 15): Promise<string> {
  const raw = generateCode()
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

/** Consume a code that must belong to `userId` (binds email+code so a low-entropy
 *  code can't be brute-forced across accounts) and set the new password. */
export async function resetPasswordWithCode(
  userId: string,
  rawCode: string,
  passwordHash: string,
): Promise<boolean> {
  const code = (rawCode || "").trim().toUpperCase()
  if (!code) return false
  const t = await prisma.verificationToken.findFirst({
    where: {
      userId,
      tokenHash: hash(code),
      purpose: PURPOSE,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
  if (!t) return false
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: t.id }, data: { consumedAt: new Date() } }),
    prisma.verificationToken.updateMany({
      where: { userId, purpose: PURPOSE, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({ where: { id: userId }, data: { passwordHash, emailVerifiedAt: new Date() } }),
  ])
  return true
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
