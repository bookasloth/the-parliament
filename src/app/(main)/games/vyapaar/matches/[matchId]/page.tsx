import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getMatchView } from "@/modules/vyapaar/match"
import { ForbiddenError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { MatchBoard } from "@/components/vyapaar/MatchBoard"
import { assignTokens } from "@/modules/vyapaar/tokens"
import { botToken } from "@/modules/vyapaar/bot"
import { analyzeLog, type SeatStat, type LogStep } from "@/modules/vyapaar/analyze"

export const dynamic = "force-dynamic"

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const user = await requireUser()
  let view, turnExpiresAt, gameEndsAt
  try {
    ;({ view, turnExpiresAt, gameEndsAt } = await getMatchView(user.id, matchId))
  } catch (e) {
    if (e instanceof ForbiddenError) notFound()
    throw e
  }
  // Players' profile photos + emails (email drives token assignment), indexed by seat.
  const [seats, match] = await Promise.all([
    prisma.vyapaarMatchPlayer.findMany({
      where: { matchId },
      select: { seat: true, userId: true, user: { select: { email: true, profile: { select: { photoUrl: true } } } } },
    }),
    prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { room: { select: { code: true } } } }),
  ])
  const playerImages: (string | null)[] = []
  for (const s of seats) playerImages[s.seat] = s.user.profile?.photoUrl ?? null

  // On a finished match, replay the stored action log into per-seat "how you played" stats
  // (rent, trades, jail terms, builds) for the results recap. Only when ended — mid-game this
  // would be wasted work, and the live board shows the plain results table.
  let recap: SeatStat[] | undefined
  if (view.ended) {
    const full = await prisma.vyapaarMatch.findUnique({
      where: { id: matchId },
      select: { state: true, actionLog: true, players: { select: { seat: true, openingCash: true } } },
    })
    if (full) {
      const seed = Number((full.state as { seed?: number }).seed ?? 0)
      const names = view.players.map((p) => p.name)
      const openingCash: number[] = []
      for (const p of full.players) openingCash[p.seat] = p.openingCash
      recap = analyzeLog(seed, names, openingCash, (full.actionLog as LogStep[]) ?? []).seats
    }
  }
  // Bots keep their own signature token; humans draw from the shared piece pool.
  const playerTokens = assignTokens(seats.map((s) => ({ seat: s.seat, email: s.user.email, token: botToken(s.userId) })), matchId)

  return (
    <MatchBoard
      matchId={matchId}
      initialView={view}
      initialTurnExpiresAt={turnExpiresAt}
      initialGameEndsAt={gameEndsAt}
      playerImages={playerImages}
      playerTokens={playerTokens}
      roomCode={match?.room.code ?? null}
      recap={recap}
    />
  )
}
