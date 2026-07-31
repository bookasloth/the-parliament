import { NextResponse } from "next/server"
import { consumeVerifyToken } from "@/lib/email-verify"
import { enforceRateLimit, RateLimitedError } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    await enforceRateLimit({ bucket: "auth.verify.ip", identifier: ip, limit: 20, windowSec: 900 })

    const { token } = await req.json()
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }
    const ok = await consumeVerifyToken(token)
    if (!ok) {
      return NextResponse.json({ error: "This link is invalid or has expired" }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof RateLimitedError) {
      return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 })
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
