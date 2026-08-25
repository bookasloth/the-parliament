import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getMatchView } from "@/modules/vyapaar/match"
import { ForbiddenError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { MatchBoard } from "@/components/vyapaar/MatchBoard"

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
  // Players' profile photos, indexed by seat, for the board avatars.
  const seats = await prisma.vyapaarMatchPlayer.findMany({
    where: { matchId },
    select: { seat: true, user: { select: { profile: { select: { photoUrl: true } } } } },
  })
  const playerImages: (string | null)[] = []
  for (const s of seats) playerImages[s.seat] = s.user.profile?.photoUrl ?? null

  return <MatchBoard matchId={matchId} initialView={view} initialTurnExpiresAt={turnExpiresAt} playerImages={playerImages} />
}
