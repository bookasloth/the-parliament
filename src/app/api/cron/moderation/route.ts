import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { expireDueSuspensions } from "@/modules/moderation/jobs"

// Daily Vercel Cron (see vercel.json). Lifts every suspension whose expiresAt has
// passed and reactivates the account when no in-force suspension remains. Without
// this a timed suspension never ends (audit P0-2).
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const results = await expireDueSuspensions()
  return NextResponse.json({ ok: true, results })
}
