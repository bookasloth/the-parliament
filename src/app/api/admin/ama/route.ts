import crypto from "node:crypto"
import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireAdmin } from "@/modules/auth/session"

const schema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional(),
  startsAt: z.string().datetime(),
  coHostId: z.string().uuid().optional(),
})

/** POST /api/admin/ama — schedule an AMA (admin only). */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { title, description, startsAt, coHostId } = schema.parse(await req.json())

    if (coHostId) {
      const exists = await prisma.user.findUnique({ where: { id: coHostId }, select: { id: true } })
      if (!exists) return badRequest("Co-host not found")
    }

    // Fix the id up front so roomName (`ama_<id>`) matches roomForAma() in the token route.
    const id = crypto.randomUUID()
    const ama = await prisma.amaSession.create({
      data: {
        id,
        roomName: `ama_${id}`,
        title,
        description: description ?? null,
        hostId: admin.id,
        coHostId: coHostId ?? null,
        startsAt: new Date(startsAt),
        status: "scheduled",
      },
    })
    return ok({ id: ama.id })
  } catch (e) {
    return handleError(e)
  }
}
