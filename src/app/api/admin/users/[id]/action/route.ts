import { NextRequest } from "next/server"
import { z } from "zod"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireAdmin } from "@/lib/gate"
import { ForbiddenError } from "@/modules/auth/session"
import { actOnUser, isSelfForbidden, USER_ACTIONS, NotFoundError, BadActionError } from "@/modules/admin/users"

const schema = z.object({
  action: z.enum(USER_ACTIONS),
  role: z.enum(["super_admin", "admin", "moderator"]).optional(),
})

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await ctx.params
    const { action, role } = schema.parse(await req.json())

    if (isSelfForbidden(action, admin.id, id)) {
      throw new ForbiddenError("You cannot perform this action on your own account")
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    const result = await actOnUser(admin.id, id, action, { role, ip })
    return ok(result)
  } catch (e) {
    if (e instanceof NotFoundError) return badRequest(e.message)
    if (e instanceof BadActionError) return badRequest(e.message)
    return handleError(e)
  }
}
