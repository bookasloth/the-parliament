"use client"
import { useState, useTransition } from "react"
import { joinRoomAction } from "@/modules/vyapaar/rooms-actions"

// "Join" on a specific empty seat. The server honours the seat if it's still free,
// otherwise it drops the player into the lowest free seat (seat-race fallback).
export function JoinSeatButton({ code, seat }: { code: string; seat: number }) {
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <span className="ml-2 inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => { setErr(null); start(async () => { const res = await joinRoomAction(code, seat); if (res && !res.ok) setErr(res.error) }) }}
        className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Joining…" : "Join seat"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  )
}
