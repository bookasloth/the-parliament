import { NextRequest } from "next/server"
import { z } from "zod"
import { handleError, ok } from "@/lib/api"
import { requirePermission } from "@/lib/gate"
import { actOnUser, isSelfForbidden } from "@/modules/admin/users"

// Bulk-safe subset (no per-user email/role args needed).
const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(["verify", "unverify", "suspend", "activate"]),
})

export async function POST(req: NextRequest) {
  try {
    const { ids, action } = schema.parse(await req.json())
    // Bulk actions are all member moderation (verify/unverify/suspend/activate).
    const admin = await requirePermission("members:moderate")
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()

    let done = 0
    for (const id of ids) {
      if (isSelfForbidden(action, admin.id, id)) continue
      try {
        await actOnUser(admin.id, id, action, { ip })
        done++
      } catch {
        // Skip missing/deleted users; report the count that succeeded.
      }
    }
    return ok({ ok: true, done, requested: ids.length })
  } catch (e) {
    return handleError(e)
  }
}
