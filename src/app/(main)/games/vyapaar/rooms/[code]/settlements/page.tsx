import Link from "next/link"
import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getRoomSettlement } from "@/modules/vyapaar/match"
import { MatchResults } from "@/components/vyapaar/MatchResults"

export const dynamic = "force-dynamic"

const inr = (n: number) => "₹" + n.toLocaleString("en-IN")

export default async function SettlementsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  await requireUser()
  const data = await getRoomSettlement(code.toUpperCase())
  if (!data) notFound()

  const ended = data.status === "over"
  // Best-first: finalized placement, then settled-out (left) players, then still-playing; ties by seat.
  const players = [...data.players].sort((a, b) => {
    if (a.placement != null && b.placement != null) return a.placement - b.placement
    if (a.placement != null) return -1
    if (b.placement != null) return 1
    return a.seat - b.seat
  })

  const name = (p: (typeof players)[number]) => p.user.displayName || p.user.legalName
  const pnl = (p: (typeof players)[number]) => (p.resultCash != null ? p.resultCash - p.openingCash : null)

  // The Bleeder: worst profit/loss among everyone who's already settled. Named and shamed.
  const settled = players.filter((p) => p.resultCash != null)
  const bleeder = settled.length ? settled.reduce((w, p) => (pnl(p)! < pnl(w)! ? p : w)) : null

  const status = (p: (typeof players)[number]) =>
    p.seat === bleeder?.seat ? "🩸 Bleeder"
      : p.seat === data.winnerSeat ? "Winner"
      : p.placement != null ? `#${p.placement}` : p.resultCash != null ? "Left" : "Playing"

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Match Results — Room {data.code}</h1>
          <p className="text-sm text-gray-500">{ended ? "Final standings by net worth" : "Match in progress — live standings"}</p>
        </div>
        <Link href={`/games/vyapaar/rooms/${data.code}`} className="rounded-lg border px-4 py-2 text-sm font-semibold">
          Back to room
        </Link>
      </div>

      {ended && data.resultsView && (
        <div className="mb-8 flex justify-center">
          <MatchResults view={data.resultsView} />
        </div>
      )}

      <h2 className="mb-1 text-lg font-bold">Coin settlement</h2>
      <p className="mb-4 text-sm text-gray-500">Wallet coins in vs out — the real economy.{ended ? " Who bled the most this game." : ""}</p>

      {bleeder && pnl(bleeder)! < 0 && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <b>{name(bleeder)}</b> is the worst Vyapaari of this game — down <b>{inr(Math.abs(pnl(bleeder)!))}</b>. Shame. 🩸
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="p-3 text-left font-semibold text-gray-500"> </th>
              {players.map((p) => (
                <th key={p.seat} className={`p-3 text-center font-semibold ${p.seat === bleeder?.seat ? "text-red-600" : p.seat === data.winnerSeat ? "text-amber-600" : "text-gray-900"}`}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{name(p)}</span>
                    <span className={`text-xs font-medium ${p.seat === bleeder?.seat ? "text-red-600" : p.seat === data.winnerSeat ? "text-amber-600" : "text-gray-400"}`}>{status(p)}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Rank">
              {players.map((p) => <Cell key={p.seat}>{p.placement != null ? `#${p.placement}` : "—"}</Cell>)}
            </Row>
            <Row label="Starting coins">
              {players.map((p) => <Cell key={p.seat}>{inr(p.openingCash)}</Cell>)}
            </Row>
            <Row label="Capital-gains tax">
              {players.map((p) => (
                <Cell key={p.seat}>{p.resultCash != null && p.tax > 0 ? <span className="text-red-600">−{inr(p.tax)}</span> : p.resultCash != null ? "—" : "—"}</Cell>
              ))}
            </Row>
            <Row label="Final coins (after tax)">
              {players.map((p) => <Cell key={p.seat}>{p.resultCash != null ? inr(p.resultCash) : "—"}</Cell>)}
            </Row>
            <Row label="Profit / Loss">
              {players.map((p) => {
                const pl = pnl(p)
                return (
                  <Cell key={p.seat}>
                    {pl == null ? "—" : <span className={pl > 0 ? "text-green-600" : pl < 0 ? "text-red-600" : "text-gray-500"}>{pl > 0 ? "+" : ""}{inr(pl)}</span>}
                  </Cell>
                )
              })}
            </Row>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="p-3 font-medium text-gray-500 whitespace-nowrap">{label}</td>
      {children}
    </tr>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="p-3 text-center font-semibold tabular-nums">{children}</td>
}
