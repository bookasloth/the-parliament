import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { processDueInviteWaves } from "@/modules/events/invites"

// Sends any due event-invite waves. Waves are staggered by membership tier
// (Life now, Premium +2h, Associate +4h, Student +6h), so this wants an hourly
// tick — but Vercel's Hobby plan rejects any cron more frequent than daily
// ("Hobby accounts are limited to daily cron jobs"), and such a schedule fails
// the whole deployment. vercel.json therefore runs this daily; all due waves
// fire in one batch on that tick.
// To restore hourly precision: upgrade to Pro, or drive this endpoint from an
// external scheduler (it accepts `Authorization: Bearer $CRON_SECRET`).
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const results = await processDueInviteWaves()
  return NextResponse.json({ ok: true, results })
}
