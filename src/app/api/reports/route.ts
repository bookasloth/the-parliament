import { NextRequest } from "next/server"
import { z } from "zod"
import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { fileReport } from "@/modules/moderation/service"
import { enforceRateLimit } from "@/lib/rate-limit"

const schema = z.object({
  entityType: z.enum(["post", "comment", "profile", "business", "message"]),
  entityId: z.string().uuid(),
  reason: z.string().min(1).max(40),
  details: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    await enforceRateLimit({
      bucket: "reports.create",
      identifier: user.id,
      limit: 20,
      windowSec: 86400,
    })
    const body = schema.parse(await req.json())
    const r = await fileReport({ reporterId: user.id, ...body })
    return ok({ id: r.id, status: r.status })
  } catch (e) {
    return handleError(e)
  }
}
