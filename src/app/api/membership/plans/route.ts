import { NextResponse } from "next/server"
import { listPublicPlans } from "@/modules/membership/service"

// Plans are static config (no DB, no per-user data) — let the CDN serve them so
// this route stops hitting a cold function on every load. Matches /api/houses
// and /api/schools.
export async function GET() {
  return NextResponse.json(
    { plans: listPublicPlans() },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  )
}
