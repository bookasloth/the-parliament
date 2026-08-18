import { NextRequest } from "next/server"
import { handleError, ok, badRequest } from "@/lib/api"
import { requirePermission } from "@/lib/gate"
import { adminAdjustKarma, adjustKarmaSchema, getKarmaHistory, NotFoundError, BadActionError } from "@/modules/admin/users"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("members:read")
    const { id } = await ctx.params
    return ok({ history: await getKarmaHistory(id) })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePermission("members:edit")
    const { id } = await ctx.params
    const { delta, reason } = adjustKarmaSchema.parse(await req.json())
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    const result = await adminAdjustKarma(admin.id, id, delta, reason, ip)
    return ok(result)
  } catch (e) {
    if (e instanceof NotFoundError) return badRequest(e.message)
    if (e instanceof BadActionError) return badRequest(e.message)
    return handleError(e)
  }
}
