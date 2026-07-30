import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/modules/auth/session"
import { colorAvatar } from "@/lib/avatar"
import { createResetToken, resetUrl } from "@/lib/password-reset"
import { sendEmail } from "@/lib/email"
import { handleError } from "@/lib/api"

const RESERVED = new Set([
  "feed", "directory", "connections", "business", "businesses", "events", "groups",
  "membership", "notifications", "settings", "compose", "messages", "network",
  "profile", "admin", "auth", "api", "onboarding", "companies",
])

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
  return base || `user-${Date.now().toString(36)}`
}

async function uniqueUsername(base: string): Promise<string> {
  if (!RESERVED.has(base) && !(await prisma.user.findUnique({ where: { username: base } }))) return base
  for (let i = 2; i < 100; i++) {
    const cand = `${base}-${i}`
    if (!(await prisma.user.findUnique({ where: { username: cand } }))) return cand
  }
  return `${base}-${Date.now().toString(36)}`
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const { email, legalName } = await req.json()
    if (!email || !legalName || typeof email !== "string" || typeof legalName !== "string") {
      return NextResponse.json({ error: "Email and legalName required" }, { status: 400 })
    }
    const normEmail = email.trim().toLowerCase()

    const existing = await prisma.user.findUnique({ where: { email: normEmail } })
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 })

    const username = await uniqueUsername(slugify(legalName))
    const user = await prisma.user.create({
      data: {
        legalName,
        email: normEmail,
        username,
        passwordHash: null,
        status: "active",
        onboardingStep: "profile",
      },
    })
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, photoUrl: colorAvatar(user.id) },
    })

    const raw = await createResetToken(user.id, 60 * 24 * 7)
    await sendEmail("password_reset", user.email, {
      legalName: user.legalName,
      resetUrl: resetUrl(raw),
      isNew: true,
    })

    return NextResponse.json({ ok: true, userId: user.id, username })
  } catch (e) {
    return handleError(e)
  }
}
