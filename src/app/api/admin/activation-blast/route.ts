import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/gate"
import { handleError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { createResetToken, resetUrl } from "@/lib/password-reset"
import { sendEmail } from "@/lib/email"

// Bulk "set your password" send for imported members. Scheduled for 14 Aug 2026;
// an admin may force it earlier/later.
const ACTIVATION_DATE = new Date("2026-08-14T00:00:00+05:30") // 14 Aug 2026, IST
const TOKEN_TTL_MINUTES = 60 * 24 * 14 // 14 days — long enough for a bulk send

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json().catch(() => ({}))
    const force = body?.force === true

    if (new Date() < ACTIVATION_DATE && !force) {
      return NextResponse.json(
        {
          error: "Activation emails are scheduled for 14 Aug 2026. Pass { force: true } to send now.",
          scheduledFor: ACTIVATION_DATE.toISOString(),
        },
        { status: 400 },
      )
    }

    // Members who can't log in yet: imported accounts with no password.
    const targets = await prisma.user.findMany({
      where: { passwordHash: null, status: "active", deletedAt: null },
      select: { id: true, email: true, legalName: true },
    })

    let sent = 0
    let failed = 0
    for (const u of targets) {
      try {
        const raw = await createResetToken(u.id, TOKEN_TTL_MINUTES)
        await sendEmail("password_reset", u.email, {
          legalName: u.legalName,
          resetUrl: resetUrl(raw),
          isNew: true,
        }, u.id)
        sent++
        await new Promise((r) => setTimeout(r, 250)) // gentle SMTP throttle
      } catch {
        failed++
      }
    }

    return NextResponse.json({ targeted: targets.length, sent, failed })
  } catch (e) {
    return handleError(e)
  }
}
