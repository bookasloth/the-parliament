import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { resetPassword } from "@/lib/password-reset"

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }
    const ok = await resetPassword(token, await bcrypt.hash(password, 12))
    if (!ok) {
      return NextResponse.json({ error: "This link is invalid or has expired" }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
