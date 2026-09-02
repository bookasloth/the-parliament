import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { runMediaGc } from "@/modules/media/gc"

// Daily Vercel Cron (see vercel.json). Purges R2/Supabase objects for posts and
// comments soft-deleted past the retention window, then nulls the field (audit
// P1-7). Without this, deleted media lived forever and stayed publicly fetchable.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const results = await runMediaGc()
  return NextResponse.json({ ok: true, results })
}
