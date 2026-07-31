import { NextRequest } from "next/server"
import { createHash, randomInt } from "node:crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"
import { sendEmail } from "@/lib/email"
import { handleError, ok, badRequest } from "@/lib/api"

const PURPOSE = "email"
const CODE_LEN = 5
const TTL_MS = 15 * 60 * 1000
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no ambiguous 0/O/1/I

function genCode(): string {
  let out = ""
  for (let i = 0; i < CODE_LEN; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

const hash = (code: string) => createHash("sha256").update(code.toUpperCase()).digest("hex")

// POST — generate a code, store its hash, email it to the signed-in user.
export async function POST() {
  try {
    const user = await requireUser()

    const code = genCode()
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, purpose: PURPOSE, consumedAt: null },
    })
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        purpose: PURPOSE,
        tokenHash: hash(code),
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    })

    await sendEmail("email_verification", user.email, {
      legalName: user.name || "there",
      code,
    }, user.id)

    // Only leak the code in dev (no SMTP configured) so the UI can auto-fill.
    return ok({ sent: true, devCode: process.env.SMTP_HOST ? undefined : code })
  } catch (e) {
    return handleError(e)
  }
}

const checkSchema = z.object({ code: z.string().trim().min(1) })

// PUT — verify a submitted code and mark the email verified.
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser()
    const { code } = checkSchema.parse(await req.json())

    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        purpose: PURPOSE,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!token || token.tokenHash !== hash(code)) {
      return badRequest("Invalid or expired code")
    }

    await prisma.$transaction([
      prisma.verificationToken.update({
        where: { id: token.id },
        data: { consumedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
    ])

    return ok({ verified: true })
  } catch (e) {
    return handleError(e)
  }
}
