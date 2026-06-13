import { NextRequest } from "next/server"
import { z } from "zod"
import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { submitVerification } from "@/modules/verification/service"
import { enforceRateLimit } from "@/lib/rate-limit"

const schema = z.object({
  method: z.enum(["id_upload", "alumni_vouch", "institute_email"]),
  evidenceKey: z.string().optional(),
  instituteEmail: z.email().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    await enforceRateLimit({
      bucket: "verification.submit",
      identifier: user.id,
      limit: 3,
      windowSec: 86400,
    })
    const body = schema.parse(await req.json())
    const v = await submitVerification({ userId: user.id, ...body })
    return ok({ id: v.id, status: v.status })
  } catch (e) {
    return handleError(e)
  }
}
