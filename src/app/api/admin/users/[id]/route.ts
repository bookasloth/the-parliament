import { NextRequest } from "next/server"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireAdmin } from "@/lib/gate"
import { editUser, editUserSchema, NotFoundError, BadActionError } from "@/modules/admin/users"

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await ctx.params
    const input = editUserSchema.parse(await req.json())
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    const result = await editUser(admin.id, id, input, ip)
    return ok(result)
  } catch (e) {
    if (e instanceof NotFoundError) return badRequest(e.message)
    if (e instanceof BadActionError) return badRequest(e.message)
    return handleError(e)
  }
}
