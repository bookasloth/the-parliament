import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Liveness + DB reachability probe. Public (no secret) — returns no sensitive
// data, just up/down. Use for uptime monitors and deploy smoke checks.
export const dynamic = "force-dynamic"

export async function GET() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      db: "up",
      latencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      { status: "degraded", db: "down", error: (e as Error).message },
      { status: 503 },
    )
  }
}
