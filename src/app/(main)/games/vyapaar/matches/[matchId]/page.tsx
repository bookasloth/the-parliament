import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getMatchView } from "@/modules/vyapaar/match"
import { ForbiddenError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { MatchBoard } from "@/components/vyapaar/MatchBoard"
import { assignTokens } from "@/modules/vyapaar/tokens"

export const dynamic = "force-dynamic"

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const user = await requireUser()
  let view, turnExpiresAt
  try {
    ;({ view, turnExpiresAt } = await getMatchView(user.id, matchId))
  } catch (e) {
    if (e instanceof ForbiddenError) notFound()
    throw e
  }
  // Players' profile photos + emails (email drives token assignment), indexed by seat.
  const [seats, match] = await Promise.all([
    prisma.vyapaarMatchPlayer.findMany({
      where: { matchId },
      select: { seat: true, user: { select: { email: true, profile: { select: { photoUrl: true } } } } },
    }),
    prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { room: { select: { code: true } } } }),
  ])
  const playerImages: (string | null)[] = []
  for (const s of seats) playerImages[s.seat] = s.user.profile?.photoUrl ?? null
  const playerTokens = assignTokens(seats.map((s) => ({ seat: s.seat, email: s.user.email })), matchId)

  return (
    <MatchBoard
      matchId={matchId}
      initialView={view}
      initialTurnExpiresAt={turnExpiresAt}
      playerImages={playerImages}
      playerTokens={playerTokens}
      roomCode={match?.room.code ?? null}
    />
  )
}
