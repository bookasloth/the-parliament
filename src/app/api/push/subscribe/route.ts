import { NextRequest } from "next/server"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"

// POST → store (or refresh) this browser's push subscription for the user.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const sub = await req.json().catch(() => null)
    const endpoint = sub?.endpoint
    const p256dh = sub?.keys?.p256dh
    const auth = sub?.keys?.auth
    if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
      return badRequest("Invalid subscription")
    }
    // Endpoint is unique; upsert re-homes it to the current user (shared device).
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh, auth },
      update: { userId: user.id, p256dh, auth },
    })
    return ok({ ok: true })
  } catch (e) {
    return handleError(e)
  }
}

// DELETE → drop this browser's subscription (user turned notifications off).
export async function DELETE(req: NextRequest) {
  try {
    await requireUser()
    const body = await req.json().catch(() => null)
    const endpoint = body?.endpoint
    if (typeof endpoint !== "string") return badRequest("Missing endpoint")
    await prisma.pushSubscription.deleteMany({ where: { endpoint } })
    return ok({ ok: true })
  } catch (e) {
    return handleError(e)
  }
}
