import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { runBotDaily } from "@/modules/bot/cron"

// Daily cron: the official NNAWCA bot's scheduled posts (weekly poll, weekly
// roundup, birthday DMs, event-tomorrow reminders, game results). One daily
// tick that branches on the date (planBotCron) — Hobby-safe. Runs 01:30 UTC =
// 07:00 IST — a member-friendly morning slot, and after alfazy-champions
// (00:20 UTC) freezes the previous night's winners so game-results sees them.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const summary = await runBotDaily(new Date())
  return NextResponse.json({ ok: true, ...summary })
}
