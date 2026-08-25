import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getMatchView } from "@/modules/vyapaar/match"
import { ForbiddenError } from "@/lib/errors"
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
  return <MatchBoard matchId={matchId} initialView={view} initialTurnExpiresAt={turnExpiresAt} />
}
