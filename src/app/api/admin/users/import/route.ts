import { NextRequest } from "next/server"
import { z } from "zod"
import { handleError, ok, badRequest } from "@/lib/api"
import { requirePermission } from "@/lib/gate"
import { parseUserCsv, importUsers } from "@/modules/admin/users"

const MAX_ROWS = 500

const schema = z.object({ csv: z.string().min(1).max(1_000_000) })

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePermission("members:edit")
    const { csv } = schema.parse(await req.json())
    const { rows, errors } = parseUserCsv(csv)
    if (rows.length === 0) return badRequest("No valid rows found", errors)
    if (rows.length > MAX_ROWS) return badRequest(`Too many rows (max ${MAX_ROWS})`)

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    const result = await importUsers(admin.id, rows, ip)
    return ok({ ...result, parseErrors: errors })
  } catch (e) {
    return handleError(e)
  }
}
