import { NextRequest } from "next/server"
import { z } from "zod"
import { handleError, ok, badRequest } from "@/lib/api"
import { requireAdmin } from "@/lib/gate"
import { setBadge, NotFoundError, BadActionError } from "@/modules/admin/users"

const schema = z.object({
  badgeId: z.string().uuid(),
  action: z.enum(["add", "remove"]),
})

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await ctx.params
    const { badgeId, action } = schema.parse(await req.json())
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    const result = await setBadge(admin.id, id, badgeId, action === "add", ip)
    return ok(result)
  } catch (e) {
    if (e instanceof NotFoundError) return badRequest(e.message)
    if (e instanceof BadActionError) return badRequest(e.message)
    return handleError(e)
  }
}
