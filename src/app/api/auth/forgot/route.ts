import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createResetToken, resetUrl } from "@/lib/password-reset"
import { sendEmail } from "@/lib/email"
import { checkRateLimit } from "@/lib/rate-limit"

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)

    // Best-effort throttle: 5 attempts per IP per 15 min.
    // Silent on limit — reply ok to avoid enumeration.
    const ipLimit = await checkRateLimit({
      bucket: "auth.forgot.ip",
      identifier: ip,
      limit: 5,
      windowSec: 900,
    })
    if (!ipLimit.allowed) return NextResponse.json({ ok: true })

    const { email } = await req.json()
    if (email && typeof email === "string") {
      const normalized = email.trim().toLowerCase()

      const emailLimit = await checkRateLimit({
        bucket: "auth.forgot.email",
        identifier: normalized,
        limit: 3,
        windowSec: 900,
      })
      if (!emailLimit.allowed) return NextResponse.json({ ok: true })

      const user = await prisma.user.findUnique({
        where: { email: normalized },
        select: { id: true, email: true, legalName: true, passwordHash: true, memberType: true },
      })
      if (user) {
        const raw = await createResetToken(user.id, 60)
        // The merged official/admin account (memberType "system") logs in as
        // admin@nnawca.com, which isn't a receivable inbox — deliver its reset
        // link to the owner's recovery address instead so admin recovery works.
        const to =
          user.memberType === "system"
            ? (process.env.ADMIN_RECOVERY_EMAIL || "sndatarkar@gmail.com")
            : user.email
        await sendEmail("password_reset", to, {
          legalName: user.legalName,
          resetUrl: resetUrl(raw),
          isNew: user.passwordHash === null,
        }, user.id)
      }
    }
    // Always succeed — never reveal whether an email is registered.
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
