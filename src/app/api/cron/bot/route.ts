import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { runBotDaily } from "@/modules/bot/cron"

// Daily cron: the official NNAWCA bot's scheduled posts (weekly poll, weekly
// roundup, birthday DMs, event-tomorrow reminders, game results). One daily
// tick that branches on the date (planBotCron) — Hobby-safe. Scheduled just
// after alfazy-champions so game-results reads freshly-frozen winners.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const summary = await runBotDaily(new Date())
  return NextResponse.json({ ok: true, ...summary })
}
