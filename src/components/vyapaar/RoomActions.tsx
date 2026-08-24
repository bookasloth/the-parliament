"use client"
import { useTransition } from "react"
import { leaveRoomAction, setVisibilityAction } from "@/modules/vyapaar/rooms-actions"

export function RoomActions({ roomId, isHost, visibility }: { roomId: string; isHost: boolean; visibility: "private" | "public" }) {
  const [pending, start] = useTransition()
  return (
    <div className="flex items-center gap-3">
      {isHost && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await setVisibilityAction(roomId, visibility === "public" ? "private" : "public") })}
          className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Make {visibility === "public" ? "private" : "public"}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => leaveRoomAction(roomId))}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
      >
        Leave
      </button>
    </div>
  )
}
