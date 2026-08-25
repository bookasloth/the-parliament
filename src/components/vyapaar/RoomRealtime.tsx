"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { realtimeTokenAction } from "@/modules/vyapaar/match-actions"

const ROOM_TOPIC = (id: string) => `vyapaar-room:${id}`

/**
 * Keeps the room page live: refreshes the lobby when someone joins/leaves, and pushes every
 * member into the match the instant the host starts. Renders nothing.
 */
export function RoomRealtime({ roomId }: { roomId: string }) {
  const router = useRouter()

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null = null
    let cancelled = false
    let refreshTimer: ReturnType<typeof setTimeout>
    const sb = getSupabaseBrowser()

    async function connect() {
      const auth = await realtimeTokenAction()
      if (!auth || cancelled) return
      await sb.realtime.setAuth(auth.token)
      refreshTimer = setTimeout(connect, 55 * 60 * 1000)
      if (channel) return
      channel = sb.channel(ROOM_TOPIC(roomId), { config: { private: true } })
      channel
        .on("broadcast", { event: "lobby" }, () => router.refresh())
        .on("broadcast", { event: "started" }, (msg: { payload?: { matchId?: string } }) => {
          const matchId = msg?.payload?.matchId
          if (matchId) router.push(`/games/vyapaar/matches/${matchId}`)
        })
        .subscribe()
    }

    connect()
    // Safety net: refresh the lobby every 6s so a missed broadcast still surfaces joins/starts.
    const poll = setInterval(() => router.refresh(), 6000)
    return () => {
      cancelled = true
      clearTimeout(refreshTimer)
      clearInterval(poll)
      if (channel) { void sb.removeChannel(channel); channel = null }
    }
  }, [roomId, router])

  return null
}
