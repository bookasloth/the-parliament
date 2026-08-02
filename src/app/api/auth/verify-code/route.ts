import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { createEmailCode, verifyEmailCode } from "@/lib/email-code"
import { sendEmail } from "@/lib/email"

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown"
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().min(1).max(10).optional(),
  resend: z.boolean().optional(),
})

// Session-less email verification for fresh signups (they can't log in until
// verified). Verifies a 5-char code by email, or resends one.
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)
    const limit = await checkRateLimit({ bucket: "auth.verifycode.ip", identifier: ip, limit: 15, windowSec: 900 })
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
    }

    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    const { email, code, resend } = parsed.data

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, legalName: true, emailVerifiedAt: true } })

    if (resend) {
      // Always 200 (don't reveal whether the email exists). Only act if it does
      // and isn't already verified.
      if (user && !user.emailVerifiedAt) {
        const fresh = await createEmailCode(user.id)
        try { await sendEmail("email_verification", email, { legalName: user.legalName, code: fresh }, user.id) } catch {}
      }
      return NextResponse.json({ ok: true })
    }

    if (!code) return NextResponse.json({ error: "Enter the code" }, { status: 400 })
    if (user?.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true })
    if (!user || !(await verifyEmailCode(user.id, code))) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
