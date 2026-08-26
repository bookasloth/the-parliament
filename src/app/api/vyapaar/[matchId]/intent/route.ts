import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/modules/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { handleError } from "@/lib/api"
import { rateLimitOk } from "@/lib/rate-limit"
import { applyMatchIntent } from "@/modules/vyapaar/match"
import type { Intent } from "@/modules/vyapaar/engine/state"

// Note: "expire_trade"/"expire_payment" are intentionally absent — they are system-only
// intents applied by the server's expiry sweeps, never accepted from a client.
const INTENT_TYPES = new Set([
  "roll", "buy", "decline", "bid", "develop", "mortgage", "unmortgage", "sell",
  "propose_trade", "respond_trade", "counter_trade", "withdraw_trade", "collect_rent",
  "confirm_payment", "restructure", "leave_game", "end_turn",
])

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)

// Type-valid but ill-formed payloads (e.g. propose_trade with no give/get) would otherwise
// reach the engine, which dereferences fields unguarded and throws — this is a 400, not a 500.
// The engine still does authoritative rule validation; this only stops the pre-validation crash.
function validIntentShape(intent: { type: string; [k: string]: unknown }): boolean {
  switch (intent.type) {
    case "bid":
      return finite(intent.amount)
    case "develop":
    case "mortgage":
    case "unmortgage":
    case "sell":
      return finite(intent.cityId)
    case "propose_trade":
    case "counter_trade": {
      const give = intent.give as { cash?: unknown; cities?: unknown } | undefined
      const get = intent.get as { cash?: unknown; cities?: unknown } | undefined
      const target = intent.type === "propose_trade" ? finite(intent.to) : finite(intent.tradeId)
      return (
        target &&
        typeof give === "object" && give !== null && finite(give.cash) && Array.isArray(give.cities) &&
        typeof get === "object" && get !== null && finite(get.cash) && Array.isArray(get.cities)
      )
    }
    case "respond_trade":
      return finite(intent.tradeId) && typeof intent.accept === "boolean"
    case "withdraw_trade":
      return finite(intent.tradeId)
    case "collect_rent":
      return finite(intent.rentId)
    case "confirm_payment":
      return finite(intent.paymentId)
    default: // roll, buy, decline, end_turn — no extra fields required
      return true
  }
}

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
  if (!validIntentShape(intent as { type: string; [k: string]: unknown })) {
    return NextResponse.json({ error: "bad_intent" }, { status: 400 })
  }
  // Rate-limit the one write a client drives in a tight loop (fail-open, see rateLimitOk).
  if (!(await rateLimitOk({ bucket: "vyapaar:intent", identifier: user.id, limit: 30, windowSec: 10 }))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }
  try {
    const res = await applyMatchIntent(user.id, matchId, intent)
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 })
    return NextResponse.json({ view: res.view, turnExpiresAt: res.turnExpiresAt })
  } catch (e) {
    if (e instanceof ForbiddenError) {
      const status = e.message === "Match not found" ? 404 : 403
      return NextResponse.json({ error: e.message }, { status })
    }
    throw e
  }
}
