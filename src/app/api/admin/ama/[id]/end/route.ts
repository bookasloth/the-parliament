import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireAdmin } from "@/modules/auth/session"
import { endCallSession } from "@/modules/calls/service"

/** POST /api/admin/ama/[id]/end — end an AMA (admin only). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const ama = await prisma.amaSession.findUnique({ where: { id } })
    if (!ama) return badRequest("AMA not found")

    await prisma.amaSession.update({ where: { id }, data: { status: "ended", endedAt: new Date() } })
    await endCallSession(ama.roomName)
    return ok({ ended: true })
  } catch (e) {
    return handleError(e)
  }
}
