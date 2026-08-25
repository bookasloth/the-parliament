import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/modules/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { handleError } from "@/lib/api"
import { getMatchView } from "@/modules/vyapaar/match"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    return handleError(e)
  }
  const { matchId } = await params
  try {
    const view = await getMatchView(user.id, matchId)
    return NextResponse.json({ view })
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.message === "Match not found" ? 404 : 403 })
    }
    throw e
  }
}
