import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { ForbiddenError } from "@/lib/errors"
import { ensureVyapaarEnrollment } from "./wallet"
import { createGame } from "./engine/state"
import type { GameState, Intent } from "./engine/state"
import { applyIntent, nextAutoIntent, rankSeats } from "./engine/engine"
import { publicView, type PublicView } from "./engine/view"
import { netWorth } from "./engine/helpers"
import { broadcastToTopic, matchTopic } from "@/lib/supabase-realtime"
import { TURN_SECONDS } from "@/config/vyapaar-match"
import crypto from "node:crypto"

/** Deadline for the next player action; null once the game has ended. */
function turnExpiresAtFor(state: GameState, nowMs: number): Date | null {
  return state.ended ? null : new Date(nowMs + TURN_SECONDS * 1000)
}

export async function activeMatchId(roomId: string): Promise<string | null> {
  const match = await prisma.vyapaarMatch.findFirst({ where: { roomId, status: "active" }, select: { id: true } })
  return match?.id ?? null
}

export async function getMatchView(
  userId: string,
  matchId: string,
): Promise<{ view: PublicView; turnExpiresAt: string | null }> {
  const match = await prisma.vyapaarMatch.findUnique({
    where: { id: matchId },
    select: { state: true, turnExpiresAt: true, players: { select: { userId: true, seat: true } } },
  })
  if (!match) throw new ForbiddenError("Match not found")
  const me = match.players.find((p) => p.userId === userId)
  if (!me) throw new ForbiddenError("not_a_player")
  const state = match.state as unknown as GameState
  return { view: publicView(state, me.seat), turnExpiresAt: match.turnExpiresAt?.toISOString() ?? null }
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
        status: "active", activeSeat: 0, turnExpiresAt: turnExpiresAtFor(state, Date.now()),
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

/**
 * Persist the post-intent state, advance the turn deadline, and settle the match if it
 * just ended. Shared by applyMatchIntent (and future intent-producing paths, e.g. the
 * turn-timer cron) so every write path stamps turnExpiresAt and settles the same way.
 */
async function commitMatchState(
  tx: Prisma.TransactionClient,
  match: { id: string; roomId: string; actionLog: unknown; players: { userId: string; seat: number; openingCash: number }[] },
  state: GameState,
  appendedLog: { seat: number; intent: Intent }[],
): Promise<Date | null> {
  const log = [...(match.actionLog as { seat: number; intent: Intent }[]), ...appendedLog]
  const expiresAt = turnExpiresAtFor(state, Date.now())
  await tx.vyapaarMatch.update({
    where: { id: match.id },
    data: {
      state: state as unknown as object,
      actionLog: log as unknown as object,
      activeSeat: state.active,
      turnExpiresAt: expiresAt,
      ...(state.ended ? { status: "over", winnerSeat: state.winner, endedAt: new Date() } : {}),
    },
  })
  if (state.ended) {
    await settleMatch(tx, match.id, state, match.players)
    // Reopen the room for a rematch.
    await tx.vyapaarRoom.update({ where: { id: match.roomId }, data: { status: "open" } })
  }
  return expiresAt
}

export async function applyMatchIntent(
  userId: string,
  matchId: string,
  intent: Intent,
): Promise<{ view: PublicView; turnExpiresAt: string | null } | { error: string }> {
  const result = await prisma.$transaction(async (tx): Promise<{ view: PublicView; turnExpiresAt: Date | null } | { error: string }> => {
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

    const expiresAt = await commitMatchState(tx, match, r.state, [{ seat: me.seat, intent }])
    return { view: publicView(r.state, me.seat), turnExpiresAt: expiresAt }
  }, { timeout: 15000 }) // settlement is ~24 sequential queries for a 6-player game; default 5s risks a prod rollback
  if ("view" in result) {
    await broadcastToTopic(matchTopic(matchId), "state", { activeSeat: result.view.active, ended: result.view.ended })
    return { view: result.view, turnExpiresAt: result.turnExpiresAt?.toISOString() ?? null }
  }
  return result
}

/** Auto-play the minimal-legal move for every turn past its deadline. Returns how many matches advanced. */
export async function autoResolveExpiredTurns(now: Date): Promise<number> {
  const due = await prisma.vyapaarMatch.findMany({
    where: { status: "active", turnExpiresAt: { lte: now } },
    select: { id: true },
    take: 100,
  })
  let resolved = 0
  for (const { id } of due) {
    const didResolve = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "vyapaar_match" WHERE id = ${id}::uuid FOR UPDATE`
      const match = await tx.vyapaarMatch.findUnique({
        where: { id },
        select: { id: true, roomId: true, status: true, state: true, actionLog: true, turnExpiresAt: true, players: { select: { userId: true, seat: true, openingCash: true } } },
      })
      // Stale guard: a real move may have advanced the turn between the query and the lock.
      if (!match || match.status !== "active" || !match.turnExpiresAt || match.turnExpiresAt > now) return false
      const state = match.state as unknown as GameState
      const startSeat = state.active
      const appended: { seat: number; intent: Intent }[] = []
      let guard = 0
      while (!state.ended && state.active === startSeat && guard++ < 40) {
        const step = nextAutoIntent(state)
        if (!step) break
        applyIntent(state, step.seat, step.intent)
        appended.push(step)
      }
      if (appended.length === 0) return false
      await commitMatchState(tx, match, state, appended)
      return true
    })
    if (didResolve) {
      await broadcastToTopic(matchTopic(id), "state", {})
      resolved++
    }
  }
  return resolved
}
