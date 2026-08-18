import { NextRequest } from "next/server"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { handleError, ok } from "@/lib/api"
import { requirePermission } from "@/lib/gate"
import {
  approveVerification,
  listPending,
  rejectVerification,
} from "@/modules/verification/service"

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    verificationId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("reject"),
    verificationId: z.string().uuid(),
    reason: z.string().min(3),
  }),
])

export async function GET() {
  try {
    await requirePermission("verification:read")
    const pending = await listPending()
    return ok({ pending })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePermission("verification:review")
    const body = actionSchema.parse(await req.json())

    if (body.action === "approve") {
      const loginUrl = `${process.env.AUTH_URL || "https://nnawca.org"}/feed`
      await approveVerification({
        verificationId: body.verificationId,
        reviewerId: admin.id,
        loginUrl,
      })
      // Verified status feeds the cached community directory (badge, verified
      // count, "verified only" filter) — refresh it now instead of waiting out
      // the revalidate window.
      // Route handlers can't use updateTag (Server Actions only); revalidateTag
      // with a cache-life profile is the route-handler-safe purge.
      revalidateTag("directory", "max")
    } else {
      await rejectVerification({
        verificationId: body.verificationId,
        reviewerId: admin.id,
        reason: body.reason,
      })
    }

    return ok({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
