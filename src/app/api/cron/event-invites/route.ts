import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { processDueInviteWaves } from "@/modules/events/invites"

// Vercel Cron hits this hourly to send any due event-invite waves (see
// vercel.json). Waves are staggered by membership tier (Life now, Premium +2h,
// Associate +4h, Student +6h); an hourly tick keeps them within ~1h of target.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const results = await processDueInviteWaves()
  return NextResponse.json({ ok: true, results })
}
