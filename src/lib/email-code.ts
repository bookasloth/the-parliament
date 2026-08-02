import { createHash, randomInt } from "node:crypto"
import { prisma } from "@/lib/prisma"

// 5-character email verification code (no ambiguous 0/O/1/I).
const PURPOSE = "email"
const CODE_LEN = 5
const TTL_MS = 15 * 60 * 1000
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function genCode(): string {
  let out = ""
  for (let i = 0; i < CODE_LEN; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

const hash = (code: string) => createHash("sha256").update(code.trim().toUpperCase()).digest("hex")

// Issue a fresh code for a user, invalidating any prior unconsumed ones.
export async function createEmailCode(userId: string): Promise<string> {
  const code = genCode()
  await prisma.verificationToken.deleteMany({ where: { userId, purpose: PURPOSE, consumedAt: null } })
  await prisma.verificationToken.create({
    data: { userId, purpose: PURPOSE, tokenHash: hash(code), expiresAt: new Date(Date.now() + TTL_MS) },
  })
  return code
}

// Verify a submitted code. On success: consume the token, mark the email
// verified and activate the account. Returns true iff the code matched.
export async function verifyEmailCode(userId: string, code: string): Promise<boolean> {
  const token = await prisma.verificationToken.findFirst({
    where: { userId, purpose: PURPOSE, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  })
  if (!token || token.tokenHash !== hash(code)) return false
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date(), status: "active" } }),
  ])
  return true
}
