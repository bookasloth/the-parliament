import { NextRequest, NextResponse } from "next/server"
import { handleError } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { getLatestCertificateUrl } from "@/modules/membership/certificate"

/** GET /api/membership/certificate → redirect to the viewer's latest yearly
 *  Certificate of Contribution PDF (owner-only, signed URL). */
export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser()
    const url = await getLatestCertificateUrl(user.id, user.id)
    if (!url) return NextResponse.json({ error: "No certificate available yet" }, { status: 404 })
    return NextResponse.redirect(url)
  } catch (e) {
    return handleError(e)
  }
}
