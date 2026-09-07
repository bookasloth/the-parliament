import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { drainOutbox } from "@/modules/outbox/drain"

// Drains the transactional outbox (audit IP-5). Pinged frequently by Supabase
// pg_cron (see supabase/outbox-drain-cron.sql) with a once-daily Vercel Cron
// fallback (vercel.json). pg_net sends POST; Vercel Cron sends GET — accept both.
// Idempotent: a run with nothing due is a no-op.
export const dynamic = "force-dynamic"
export const maxDuration = 60

async function handle(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const result = await drainOutbox()
  return NextResponse.json({ ok: true, ...result })
}

export const GET = handle
export const POST = handle
