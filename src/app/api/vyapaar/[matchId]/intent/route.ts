import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/modules/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { handleError } from "@/lib/api"
import { applyMatchIntent } from "@/modules/vyapaar/match"
import type { Intent } from "@/modules/vyapaar/engine/state"

const INTENT_TYPES = new Set([
  "roll", "buy", "decline", "bid", "develop", "mortgage", "unmortgage", "propose_trade", "respond_trade", "end_turn",
])

export async function POST(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    return handleError(e)
  }
  const { matchId } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad_body" }, { status: 400 })
  }
  const intent = (body as { intent?: Intent })?.intent
  if (!intent || typeof intent !== "object" || !INTENT_TYPES.has((intent as { type?: string }).type ?? "")) {
    return NextResponse.json({ error: "bad_intent" }, { status: 400 })
  }
  try {
    const res = await applyMatchIntent(user.id, matchId, intent)
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 })
    return NextResponse.json({ view: res.view })
  } catch (e) {
    if (e instanceof ForbiddenError) {
      const status = e.message === "Match not found" ? 404 : 403
      return NextResponse.json({ error: e.message }, { status })
    }
    throw e
  }
}
