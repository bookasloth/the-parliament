"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Browser Supabase client, used ONLY for Realtime (private channels). Auth comes
// from a per-user token minted server-side (realtimeTokenAction) via setAuth —
// the anon key alone can't join a private channel. No DB/storage access here;
// all data still flows through the Prisma server actions.
let client: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (client) return client
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anon) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY not configured")
  // SUPABASE_URL isn't NEXT_PUBLIC; use the public URL or derive it from the anon JWT ref.
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || projectUrlFromAnon(anon)
  client = createClient(projectUrl, anon, { realtime: { params: { eventsPerSecond: 10 } } })
  return client
}

function projectUrlFromAnon(anon: string): string {
  try {
    const payload = JSON.parse(atob(anon.split(".")[1]))
    if (payload.ref) return `https://${payload.ref}.supabase.co`
  } catch {
    /* fall through */
  }
  throw new Error("Could not derive Supabase project URL — set NEXT_PUBLIC_SUPABASE_URL")
}
