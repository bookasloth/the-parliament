import Link from "next/link"
import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getRoomSettlement } from "@/modules/vyapaar/match"
import { MatchResults } from "@/components/vyapaar/MatchResults"

export const dynamic = "force-dynamic"

export default async function SettlementsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  await requireUser()
  const data = await getRoomSettlement(code.toUpperCase())
  if (!data) notFound()
  const ended = data.status === "over"

  return (
    <div className="mx-auto w-full max-w-[1160px]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Match Results</h1>
          <p className="text-sm text-gray-500">Room {data.code} · {ended ? "final standings by net worth" : "match in progress"}</p>
        </div>
        <Link href={`/games/vyapaar/rooms/${data.code}`} className="rounded-lg border px-4 py-2 text-sm font-semibold whitespace-nowrap">
          Back to room
        </Link>
      </div>

      {ended && data.resultsView ? (
        <MatchResults
          view={data.resultsView}
          income={Object.fromEntries(data.players.map((p) => [p.seat, (p.resultCash ?? p.openingCash) - p.openingCash]))}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
          This match is still in progress — results appear here once it ends.
        </div>
      )}
    </div>
  )
}
