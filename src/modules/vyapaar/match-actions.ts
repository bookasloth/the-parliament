"use server"
import { optionalUser } from "@/modules/auth/session"
import { signRealtimeToken } from "@/lib/supabase-realtime"

export async function realtimeTokenAction(): Promise<{ token: string; userId: string } | null> {
  const u = await optionalUser()
  if (!u) return null
  return { token: signRealtimeToken(u.id), userId: u.id }
}
