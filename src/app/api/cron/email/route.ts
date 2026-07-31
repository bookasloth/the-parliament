import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { drainEmailOutbox } from "@/modules/email/service"

// Vercel Cron hits this to flush the email outbox — mail that deliver() deferred
// during quiet hours (22:00–07:00 IST) and any future enqueue-for-later sends.
// Scheduled outside quiet hours (see vercel.json); drainEmailOutbox() no-ops if
// it somehow runs inside them.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const results = await drainEmailOutbox()
  return NextResponse.json({ ok: true, results })
}
