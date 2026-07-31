import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { runMembershipMaintenance } from "@/modules/membership/jobs"

// Vercel Cron hits this daily (see vercel.json). It runs every membership
// maintenance task — expiry, renewal reminders, committee warnings, invite
// expiry, upsell nudges — which pg-boss was supposed to run but never did
// (pg-boss needs a long-lived worker; Vercel has none).
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const results = await runMembershipMaintenance()
  return NextResponse.json({ ok: true, results })
}
