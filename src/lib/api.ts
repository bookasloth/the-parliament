import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { ForbiddenError, UnauthorizedError } from "@/modules/auth/session"

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
  console.error("API error:", error)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
