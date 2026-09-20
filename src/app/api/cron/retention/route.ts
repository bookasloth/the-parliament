import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { runRetention } from "@/modules/retention/prune"

// Daily Vercel Cron (see vercel.json). Prunes PostImpression + Notification rows
// past their retention window (audit §5 #4/#5) — the two unbounded-growth tables.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const results = await runRetention()
  return NextResponse.json({ ok: true, results })
}
