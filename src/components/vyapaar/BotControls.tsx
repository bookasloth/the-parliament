"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addBotAction, removeBotAction } from "@/modules/vyapaar/rooms-actions"

// Host-only: seat a computer player in the next free seat. The lobby also refreshes over
// realtime (pingLobby), but router.refresh() makes the host's own view snappy.
export function AddBotButton({ roomId }: { roomId: string }) {
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => { setErr(null); start(async () => { const res = await addBotAction(roomId); if (!res.ok) setErr(res.error); else router.refresh() }) }}
        className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Adding…" : "+ Add bot"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  )
}

// Host-only: free a bot's seat (e.g. to make room for a human).
export function RemoveBotButton({ roomId, seat }: { roomId: string; seat: number }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { const res = await removeBotAction(roomId, seat); if (res.ok) router.refresh() })}
      className="ml-2 text-xs text-gray-400 underline disabled:opacity-50 hover:text-red-600"
    >
      {pending ? "…" : "remove"}
    </button>
  )
}
