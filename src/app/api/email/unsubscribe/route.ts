import { NextRequest, NextResponse } from "next/server"
import { consumeUnsubscribeToken, setOptOut } from "@/modules/email/service"

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 })
  const result = await consumeUnsubscribeToken(token)
  if (!result) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
  await setOptOut(result.userId, result.category)
  return NextResponse.redirect(new URL("/settings/email?unsubscribed=" + result.category, req.url))
}

export async function POST(req: NextRequest) {
  return GET(req)
}
