import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { evaluateRecentlyActive } from "@/modules/badges/cron"

// Daily badge sweep: evaluate cron/time-based badges (streaks, tenure, profile-view
// legend) plus a backstop pass over event badges for recently-active users. Fails
// closed without CRON_SECRET. Scheduled in vercel.json.
export const dynamic = "force-dynamic"
export const maxDuration = 60

async function handle(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const result = await evaluateRecentlyActive()
  return NextResponse.json({ ok: true, ...result })
}

export const GET = handle
export const POST = handle
