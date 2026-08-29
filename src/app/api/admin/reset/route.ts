import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createResetCode, resetPasswordWithCode } from "@/lib/password-reset"
import { sendEmail } from "@/lib/email"
import { checkRateLimit } from "@/lib/rate-limit"

// Self-service admin password reset via a 6-char code emailed to the owner's
// recovery address. Scoped to the merged official/admin account (memberType
// "system"), whose login inbox (admin@nnawca.com) isn't receivable. Members use
// the link flow at /auth/forgot instead.
const RECOVERY_EMAIL = process.env.ADMIN_RECOVERY_EMAIL || "sndatarkar@gmail.com"

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
}

/** Mask the recovery address in the UI hint: s***@gmail.com */
function maskEmail(email: string): string {
  const [user, domain] = email.split("@")
  if (!domain) return "your recovery email"
  return `${user.slice(0, 1)}***@${domain}`
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  let body: { email?: unknown; code?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const code = typeof body.code === "string" ? body.code : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  // ── Confirm branch: email + code + new password → reset ──────────────────
  if (code || password) {
    // Tight limiter — the code is low-entropy, so cap guesses hard.
    const lim = await checkRateLimit({ bucket: "admin.reset.confirm", identifier: `${ip}:${email}`, limit: 5, windowSec: 900 })
    if (!lim.allowed) return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 })

    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, memberType: true } })
    // Only the system/admin account uses the code flow. Generic error either way
    // so a wrong email/code/account can't be told apart.
    if (!user || user.memberType !== "system") {
      return NextResponse.json({ error: "Invalid code or it has expired" }, { status: 400 })
    }
    const ok = await resetPasswordWithCode(user.id, code, await bcrypt.hash(password, 12))
    if (!ok) return NextResponse.json({ error: "Invalid code or it has expired" }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  // ── Request branch: email only → send a code to the recovery address ─────
  const lim = await checkRateLimit({ bucket: "admin.reset.request", identifier: `${ip}:${email}`, limit: 3, windowSec: 900 })
  // Always reply ok (+ masked hint) so this never reveals whether the account exists.
  if (lim.allowed) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, legalName: true, memberType: true } })
    if (user && user.memberType === "system") {
      const codeRaw = await createResetCode(user.id, 15)
      await sendEmail("password_reset_code", RECOVERY_EMAIL, { legalName: user.legalName, code: codeRaw }, user.id)
    }
  }
  return NextResponse.json({ ok: true, sentTo: maskEmail(RECOVERY_EMAIL) })
}
