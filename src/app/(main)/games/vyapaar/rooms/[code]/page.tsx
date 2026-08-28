import Link from "next/link"
import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getRoom } from "@/modules/vyapaar/rooms"
import { activeMatchId } from "@/modules/vyapaar/match"
import { RoomActions } from "@/components/vyapaar/RoomActions"
import { RoomRealtime } from "@/components/vyapaar/RoomRealtime"
import { StartGameButton } from "@/components/vyapaar/StartGameButton"
import { JoinSeatButton } from "@/components/vyapaar/JoinSeatButton"
import { AddBotButton, RemoveBotButton } from "@/components/vyapaar/BotControls"
import { isBotUserId } from "@/modules/vyapaar/bot"
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
  const matchId = room.status === "in_game" ? await activeMatchId(room.id) : null

  return (
    <div className="space-y-4">
      {isMember && <RoomRealtime roomId={room.id} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Room {room.code}</h1>
          <p className="text-sm text-gray-500">{room.visibility} · {room.status}</p>
        </div>
        <div className="flex items-center gap-3">
          {isHost && room.status === "open" && room.members.length < MAX_SEATS && <AddBotButton roomId={room.id} />}
          {isHost && room.status === "open" && room.members.length >= 2 && <StartGameButton roomId={room.id} />}
          {isMember && room.status === "in_game" && matchId && (
            <Link href={`/games/vyapaar/matches/${matchId}`} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
              Enter game
            </Link>
          )}
          <Link href={`/games/vyapaar/rooms/${room.code}/settlements`} className="rounded-lg border px-4 py-2 text-sm font-semibold">
            Settlements
          </Link>
          {isMember && <RoomActions roomId={room.id} isHost={isHost} visibility={room.visibility as "private" | "public"} />}
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {seats.map((m, i) => (
          <li key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
            <span className="mr-2 text-gray-400">Seat {i + 1}</span>
            {m ? (
              <span className="font-medium">
                {m.user.displayName || m.user.legalName}
                {m.userId === room.hostId && <span className="ml-2 text-xs text-amber-600">host</span>}
                {isBotUserId(m.userId) && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">bot</span>}
                {isBotUserId(m.userId) && isHost && room.status === "open" && <RemoveBotButton roomId={room.id} seat={i} />}
              </span>
            ) : !isMember && room.status === "open" ? (
              <JoinSeatButton code={room.code} seat={i} />
            ) : (
              <span className="text-gray-400">empty</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
