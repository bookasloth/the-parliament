import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { postDueChallenges } from "@/modules/games/flag-challenge"

// Daily cron: post the day's queued Flag Challenge (and any earlier ones that
// were missed) as a flag feed post from the official account. Idempotent —
// a challenge already linked to a post is skipped, so re-runs are safe.
// Hobby-safe (daily only).
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const posted = await postDueChallenges(new Date())
  return NextResponse.json({ ok: true, posted })
}
