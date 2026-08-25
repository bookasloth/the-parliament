import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { ensureVyapaarEnrollment } from "./wallet"
import { createGame } from "./engine/state"
import type { GameState, Intent } from "./engine/state"
import { applyIntent, rankSeats } from "./engine/engine"
import { publicView, type PublicView } from "./engine/view"
import { netWorth } from "./engine/helpers"
import { broadcastToTopic, matchTopic } from "@/lib/supabase-realtime"
import crypto from "node:crypto"

export async function getMatchView(userId: string, matchId: string): Promise<PublicView> {
  const match = await prisma.vyapaarMatch.findUnique({
    where: { id: matchId },
    select: { state: true, players: { select: { userId: true, seat: true } } },
  })
  if (!match) throw new ForbiddenError("Match not found")
  const me = match.players.find((p) => p.userId === userId)
  if (!me) throw new ForbiddenError("not_a_player")
  return publicView(match.state as unknown as GameState, me.seat)
}

/** Deterministic rebuild from stored inputs — replay/audit/resume. */
export function rebuildMatchState(
  seed: number,
  names: string[],
  openingCash: number[],
  log: { seat: number; intent: Intent }[],
): GameState {
  const s = createGame(seed, names, openingCash)
  for (const { seat, intent } of log) applyIntent(s, seat, intent)
  return s
}

export async function startMatch(userId: string, roomId: string): Promise<{ matchId: string }> {
  const room0 = await prisma.vyapaarRoom.findUnique({ where: { id: roomId }, select: { members: { select: { userId: true } } } })
  if (!room0) throw new ForbiddenError("Room not found")
  const memberIds = room0.members.map((m) => m.userId).sort()
  for (const id of memberIds) await ensureVyapaarEnrollment(id)

  return prisma.$transaction(async (tx) => {
    // Lock the participating users' rows so concurrent starts sharing a member serialize.
    await tx.$executeRaw`SELECT id FROM "users" WHERE id = ANY(${memberIds}::uuid[]) ORDER BY id FOR UPDATE`
    const room = await tx.vyapaarRoom.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true, status: true, members: { orderBy: { seat: "asc" }, select: { userId: true, user: { select: { displayName: true, legalName: true, vyapaarWallet: true } } } } },
    })
    if (!room) throw new ForbiddenError("Room not found")
    if (room.hostId !== userId) throw new ForbiddenError("Only the host can start the game")
    if (room.status !== "open") throw new ForbiddenError("Room is not open")
    if (room.members.length < 2 || room.members.length > 6) throw new ForbiddenError("Need 2 to 6 players")
    const busy = await tx.vyapaarMatchPlayer.findFirst({
      where: { userId: { in: room.members.map((m) => m.userId) }, match: { status: "active" } },
      select: { user: { select: { displayName: true, legalName: true } } },
    })
    if (busy) throw new ForbiddenError(`${busy.user.displayName || busy.user.legalName} is already in a game`)

    const seated = room.members
    const names = seated.map((m) => m.user.displayName || m.user.legalName)
    const openingCash = seated.map((m) => m.user.vyapaarWallet)
    const seed = crypto.randomInt(2 ** 31)
    const state = createGame(seed, names, openingCash)
    const match = await tx.vyapaarMatch.create({
      data: {
        roomId: room.id, seed: BigInt(seed), state: state as unknown as object, actionLog: [],
        status: "active", activeSeat: 0,
        players: { create: seated.map((m, i) => ({ userId: m.userId, seat: i, openingCash: openingCash[i] })) },
      },
      select: { id: true },
    })
    await tx.vyapaarRoom.update({ where: { id: room.id }, data: { status: "in_game" } })
    return { matchId: match.id }
  })
}

/** Set final wallets/placements/stats from the ended game state. One `$transaction` with the caller. */
async function settleMatch(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  matchId: string,
  state: GameState,
  players: { userId: string; seat: number; openingCash: number }[],
): Promise<void> {
  const order = rankSeats(state)
  const placementBySeat = new Map<number, number>()
  order.forEach((seat, i) => placementBySeat.set(seat, i + 1))

  for (const p of players) {
    const resultCash = state.players[p.seat].cash
    await tx.vyapaarMatchPlayer.update({
      where: { matchId_seat: { matchId, seat: p.seat } },
      data: { resultCash, placement: placementBySeat.get(p.seat)! },
    })
    // VyapaarLedger has no matchId column (M1 schema: userId/delta/reason/refId) — refId carries the match id.
    await tx.vyapaarLedger.create({
      data: { userId: p.userId, delta: resultCash - p.openingCash, reason: "game_settlement", refId: matchId },
    })
    await tx.user.update({
      where: { id: p.userId },
      data: {
        // Increment (not set): a concurrent topUpVyapaarCoins mid-match grows wallet+ledger
        // together, and this must add the game P&L on top rather than clobber it. Delta
        // equals the ledger row above, so wallet == Σledger holds. No-op on the happy path
        // (wallet still == openingCash → increment lands exactly on resultCash).
        vyapaarWallet: { increment: resultCash - p.openingCash },
        vyapaarGamesPlayed: { increment: 1 },
        vyapaarWins: p.seat === state.winner ? { increment: 1 } : undefined,
      },
    })
    // bestNetWorth is a max against the current value — guarded conditional update.
    const nw = Math.round(netWorth(state, p.seat))
    await tx.user.updateMany({
      where: { id: p.userId, vyapaarBestNetWorth: { lt: nw } },
      data: { vyapaarBestNetWorth: nw },
    })
  }
}

export async function applyMatchIntent(
  userId: string,
  matchId: string,
  intent: Intent,
): Promise<{ view: PublicView } | { error: string }> {
  const result = await prisma.$transaction(async (tx): Promise<{ view: PublicView } | { error: string }> => {
    // Serialize concurrent intents on this match (prevents lost-update + double-settle
    // when two calls — double-click, retry, or legal concurrent bid/trade-response from
    // a non-active seat — race the same snapshot).
    await tx.$executeRaw`SELECT id FROM "vyapaar_match" WHERE id = ${matchId}::uuid FOR UPDATE`
    const match = await tx.vyapaarMatch.findUnique({
      where: { id: matchId },
      select: {
        id: true, roomId: true, status: true, state: true, actionLog: true,
        players: { select: { userId: true, seat: true, openingCash: true } },
      },
    })
    if (!match || match.status !== "active") throw new ForbiddenError("Match not found")
    const me = match.players.find((p) => p.userId === userId)
    if (!me) throw new ForbiddenError("not_a_player")

    const state = match.state as unknown as GameState
    const r = applyIntent(state, me.seat, intent)
    if ("error" in r) return { error: r.error } // no writes done; the row lock releases on commit

    const log = [...(match.actionLog as { seat: number; intent: Intent }[]), { seat: me.seat, intent }]
    await tx.vyapaarMatch.update({
      where: { id: matchId },
      data: {
        state: r.state as unknown as object,
        actionLog: log as unknown as object,
        activeSeat: r.state.active,
        ...(r.state.ended
          ? { status: "over", winnerSeat: r.state.winner, endedAt: new Date() }
          : {}),
      },
    })
    if (r.state.ended) {
      await settleMatch(tx, matchId, r.state, match.players)
      // Reopen the room for a rematch.
      await tx.vyapaarRoom.update({ where: { id: match.roomId }, data: { status: "open" } })
    }
    return { view: publicView(r.state, me.seat) }
  }, { timeout: 15000 }) // settlement is ~24 sequential queries for a 6-player game; default 5s risks a prod rollback
  if ("view" in result) {
    await broadcastToTopic(matchTopic(matchId), "state", { activeSeat: result.view.active, ended: result.view.ended })
  }
  return result
}
