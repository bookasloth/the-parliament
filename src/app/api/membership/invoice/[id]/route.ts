import { NextRequest, NextResponse } from "next/server"
import { handleError } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { getInvoiceUrl } from "@/modules/membership/invoice"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await params
    const url = await getInvoiceUrl(id, user.id)
    if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.redirect(url)
  } catch (e) {
    return handleError(e)
  }
}
