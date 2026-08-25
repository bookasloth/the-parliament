"use server"
import { redirect } from "next/navigation"
import { optionalUser, requireUser } from "@/modules/auth/session"
import { signRealtimeToken } from "@/lib/supabase-realtime"
import { startMatch } from "@/modules/vyapaar/match"
import { rateLimitOk } from "@/lib/rate-limit"
import { ForbiddenError } from "@/lib/errors"

export async function realtimeTokenAction(): Promise<{ token: string; userId: string } | null> {
  const u = await optionalUser()
  if (!u) return null
  return { token: signRealtimeToken(u.id), userId: u.id }
}

export async function startMatchAction(roomId: string): Promise<{ ok: false; error: string } | void> {
  const user = await requireUser()
  if (!(await rateLimitOk({ bucket: "vyapaar:start", identifier: user.id, limit: 10, windowSec: 60 }))) {
    return { ok: false, error: "Too many attempts — try again shortly" }
  }
  let matchId: string
  try {
    const res = await startMatch(user.id, roomId)
    matchId = res.matchId
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message }
    throw e
  }
  redirect(`/games/vyapaar/matches/${matchId}`)
}
