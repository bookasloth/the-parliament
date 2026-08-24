import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { sweepExpiredRooms } from "@/modules/vyapaar/rooms"

// Daily cron: marks idle Vyapaar rooms (open/in_game, no activity past the TTL) as
// expired. Idempotent — re-running just re-matches an empty set.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const expired = await sweepExpiredRooms(new Date())
  return NextResponse.json({ ok: true, expired })
}
