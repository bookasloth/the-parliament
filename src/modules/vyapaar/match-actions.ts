"use server"
import { redirect } from "next/navigation"
import { optionalUser, requireUser } from "@/modules/auth/session"
import { signRealtimeToken } from "@/lib/supabase-realtime"
import { startMatch } from "@/modules/vyapaar/match"
import { ForbiddenError } from "@/lib/errors"

export async function realtimeTokenAction(): Promise<{ token: string; userId: string } | null> {
  const u = await optionalUser()
  if (!u) return null
  return { token: signRealtimeToken(u.id), userId: u.id }
}

export async function startMatchAction(roomId: string): Promise<{ ok: false; error: string } | void> {
  const user = await requireUser()
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
