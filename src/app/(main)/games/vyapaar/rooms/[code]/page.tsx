import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getRoom } from "@/modules/vyapaar/rooms"
import { RoomActions } from "@/components/vyapaar/RoomActions"
import { MAX_SEATS } from "@/config/vyapaar-rooms"

export const dynamic = "force-dynamic"

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const user = await requireUser()
  const room = await getRoom(code.toUpperCase())
  if (!room || room.status === "expired") notFound()

  const isMember = room.members.some((m) => m.userId === user.id)
  const isHost = room.hostId === user.id
  const seats = Array.from({ length: MAX_SEATS }, (_, i) => room.members.find((m) => m.seat === i) ?? null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Room {room.code}</h1>
          <p className="text-sm text-gray-500">{room.visibility} · {room.status}</p>
        </div>
        {isMember && <RoomActions roomId={room.id} isHost={isHost} visibility={room.visibility as "private" | "public"} />}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {seats.map((m, i) => (
          <li key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
            <span className="mr-2 text-gray-400">Seat {i + 1}</span>
            {m ? (
              <span className="font-medium">
                {m.user.displayName || m.user.legalName}
                {m.userId === room.hostId && <span className="ml-2 text-xs text-amber-600">host</span>}
              </span>
            ) : (
              <span className="text-gray-400">empty</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
