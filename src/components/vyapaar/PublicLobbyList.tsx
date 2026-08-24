import Link from "next/link"
import { listPublicRooms } from "@/modules/vyapaar/rooms"
import { MAX_SEATS } from "@/config/vyapaar-rooms"

export async function PublicLobbyList() {
  const rooms = await listPublicRooms()
  if (rooms.length === 0) return <p className="text-sm text-gray-500">No public rooms right now.</p>
  return (
    <ul className="grid gap-2">
      {rooms.map((r) => (
        <li key={r.code}>
          <Link
            href={`/games/vyapaar/rooms/${r.code}`}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            <span className="font-medium">{r.host}&rsquo;s room</span>
            <span className="text-gray-500">{r.seats}/{MAX_SEATS} · {r.code}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
