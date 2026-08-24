"use client"
import { useState, useTransition } from "react"
import { joinRoomAction } from "@/modules/vyapaar/rooms-actions"

export function JoinByCode() {
  const [code, setCode] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setErr(null)
        start(async () => {
          const res = await joinRoomAction(code)
          if (res && !res.ok) setErr(res.error)
        })
      }}
      className="flex items-center gap-2"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter room code"
        maxLength={6}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
      />
      <button type="submit" disabled={pending || code.length < 6} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">
        Join
      </button>
      {err && <span className="text-sm text-red-600">{err}</span>}
    </form>
  )
}
