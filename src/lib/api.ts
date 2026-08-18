import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { ForbiddenError, UnauthorizedError } from "@/modules/auth/session"
import { RateLimitedError } from "@/lib/rate-limit"

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 })
}

export function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.issues },
      { status: 400 },
    )
  }
  if (error instanceof RateLimitedError) {
    const retryAfter = Math.max(1, Math.ceil((error.resetAt.getTime() - Date.now()) / 1000))
    return NextResponse.json(
      { error: "Too many requests — slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    )
  }
  console.error("API error:", error)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
