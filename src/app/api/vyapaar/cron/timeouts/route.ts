import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { autoResolveExpiredTurns } from "@/modules/vyapaar/match"

// pg_cron pings this every ~10s (see supabase/vyapaar-turn-timer-cron.sql) to auto-play
// any turn past its 30s deadline. Idempotent — re-running just re-matches an empty set.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const resolved = await autoResolveExpiredTurns(new Date())
  return NextResponse.json({ ok: true, resolved })
}
