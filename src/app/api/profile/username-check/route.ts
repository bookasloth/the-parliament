import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"
import { handleError } from "@/lib/api"
import { validateUsernameFormat } from "@/lib/username-check"

// Live username-availability check for the profile-edit form. Members only —
// this probes the user table, so it must be gated (middleware doesn't cover /api).
export async function GET(req: Request) {
  try {
    const me = await requireUser()
    const raw = new URL(req.url).searchParams.get("u") ?? ""

    const fmt = validateUsernameFormat(raw)
    if (!fmt.ok) {
      return NextResponse.json({ available: false, slug: fmt.slug, reason: fmt.reason })
    }

    // The user keeping their own current username is always "available".
    const clash = await prisma.user.findFirst({
      where: { username: fmt.slug, id: { not: me.id } },
      select: { id: true },
    })
    return clash
      ? NextResponse.json({ available: false, slug: fmt.slug, reason: "That username is taken" })
      : NextResponse.json({ available: true, slug: fmt.slug })
  } catch (e) {
    return handleError(e)
  }
}
