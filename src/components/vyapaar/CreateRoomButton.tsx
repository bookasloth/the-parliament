"use client"
import { useState, useTransition } from "react"
import { createRoomAction } from "@/modules/vyapaar/rooms-actions"

export function CreateRoomButton() {
  const [pending, start] = useTransition()
  const [pub, setPub] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1.5 text-sm text-gray-600">
        <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} /> Public
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => createRoomAction(pub ? "public" : "private"))}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Create room
      </button>
    </div>
  )
}
