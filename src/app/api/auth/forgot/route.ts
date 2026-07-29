import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createResetToken, resetUrl } from "@/lib/password-reset"
import { sendEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (email && typeof email === "string") {
      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true, email: true, legalName: true, passwordHash: true },
      })
      if (user) {
        const raw = await createResetToken(user.id, 60)
        await sendEmail("password_reset", user.email, {
          legalName: user.legalName,
          resetUrl: resetUrl(raw),
          isNew: user.passwordHash === null,
        })
      }
    }
    // Always succeed — never reveal whether an email is registered.
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
