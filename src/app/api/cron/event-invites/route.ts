import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { processDueInviteWaves } from "@/modules/events/invites"
import { sendEventReminders } from "@/modules/events/service"

// Sends any due event-invite waves. Waves are staggered by membership tier
// (Life now, Premium +2h, Associate +4h, Student +6h), so this wants an hourly
// tick — but Vercel's Hobby plan rejects any cron more frequent than daily
// ("Hobby accounts are limited to daily cron jobs"), and such a schedule fails
// the whole deployment. vercel.json therefore runs this daily; all due waves
// fire in one batch on that tick.
// Hourly precision is restored for free by .github/workflows/cron-event-invites.yml,
// which calls this endpoint every hour with `Authorization: Bearer $CRON_SECRET`.
// The daily Vercel cron stays as a safety net if that workflow is ever disabled.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const results = await processDueInviteWaves()
  const reminders = await sendEventReminders()
  return NextResponse.json({ ok: true, results, reminders })
}
