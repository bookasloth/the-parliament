import { NextRequest } from "next/server"
import { z } from "zod"
import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { getSignedUpload, type UploadKind } from "@/lib/r2"
import { enforceRateLimit } from "@/lib/rate-limit"

const schema = z.object({
  kind: z.enum(["verification", "avatar", "post", "business", "event_banner"]),
  contentType: z.string(),
  ext: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    await enforceRateLimit({
      bucket: "uploads.sign",
      identifier: user.id,
      limit: 30,
      windowSec: 3600,
    })
    const body = schema.parse(await req.json())
    const signed = await getSignedUpload({
      kind: body.kind as UploadKind,
      ownerId: user.id,
      contentType: body.contentType,
      ext: body.ext,
    })
    return ok(signed)
  } catch (e) {
    return handleError(e)
  }
}
