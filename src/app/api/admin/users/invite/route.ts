import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/gate"
import { createInvitedUser, BadActionError } from "@/modules/admin/users"
import { handleError } from "@/lib/api"

export async function POST(req: Request) {
  try {
    await requirePermission("members:edit")
    const { email, legalName } = await req.json()
    if (!email || !legalName || typeof email !== "string" || typeof legalName !== "string") {
      return NextResponse.json({ error: "Email and legalName required" }, { status: 400 })
    }
    const { userId, username } = await createInvitedUser(legalName, email)
    return NextResponse.json({ ok: true, userId, username })
  } catch (e) {
    if (e instanceof BadActionError) return NextResponse.json({ error: e.message }, { status: 409 })
    return handleError(e)
  }
}
