import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireAdmin } from "@/lib/gate"
import { audit } from "@/lib/audit"
import type { EmailStatus } from "@/generated/prisma/enums"

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const url = new URL(req.url)
    const status = url.searchParams.get("status") || undefined
    const category = url.searchParams.get("category") || undefined
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500)

    const messages = await prisma.emailMessage.findMany({
      where: {
        ...(status ? { status: status as EmailStatus } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { queuedAt: "desc" },
      take: limit,
    })
    return ok({ messages })
  } catch (e) {
    return handleError(e)
  }
}

// Requeue a failed email for immediate retry (audit P1-8): reset attempts and
// clear the backoff so the next drain picks it up.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { id } = await req.json().catch(() => ({}))
    if (typeof id !== "string" || !id) return badRequest("id required")
    const res = await prisma.emailMessage.updateMany({
      where: { id, status: "failed" },
      data: { status: "queued", attempts: 0, nextAttemptAt: null, error: null },
    })
    if (res.count === 0) return badRequest("No failed email with that id")
    await audit({ actorId: admin.id, action: "email.retry", entityType: "email", entityId: id })
    return ok({ requeued: true })
  } catch (e) {
    return handleError(e)
  }
}
