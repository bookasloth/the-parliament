"use client"
import { useState, useTransition } from "react"
import { startMatchAction } from "@/modules/vyapaar/match-actions"

export function StartGameButton({ roomId }: { roomId: string }) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  return (
    <span className="flex items-center gap-2">
      <button disabled={pending} onClick={() => { setErr(null); start(async () => { const r = await startMatchAction(roomId); if (r && !r.ok) setErr(r.error) }) }} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Start game</button>
      {err && <span className="text-sm text-red-600">{err}</span>}
    </span>
  )
}
