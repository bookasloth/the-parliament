import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { ensureVyapaarEnrollment } from "./wallet"
import { createGame } from "./engine/state"
import type { GameState, Intent } from "./engine/state"
import { applyIntent } from "./engine/engine"
import { publicView, type PublicView } from "./engine/view"
import { scoreOf, netWorth, controlledSets } from "./engine/helpers"
import crypto from "node:crypto"

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
  const room = await prisma.vyapaarRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true, hostId: true, status: true,
      members: {
        orderBy: { seat: "asc" },
        select: { userId: true, seat: true, user: { select: { displayName: true, legalName: true } } },
      },
    },
  })
  if (!room) throw new ForbiddenError("Room not found")
  if (room.hostId !== userId) throw new ForbiddenError("Only the host can start the game")
  if (room.status !== "open") throw new ForbiddenError("Room is not open")
  if (room.members.length < 2 || room.members.length > 6) throw new ForbiddenError("Need 2 to 6 players")

  const memberIds = room.members.map((m) => m.userId)
  // One-active-match rule (double-spend guard).
  const busy = await prisma.vyapaarMatchPlayer.findFirst({
    where: { userId: { in: memberIds }, match: { status: "active" } },
    select: { user: { select: { displayName: true, legalName: true } } },
  })
  if (busy) throw new ForbiddenError(`${busy.user.displayName || busy.user.legalName} is already in a game`)

  for (const id of memberIds) await ensureVyapaarEnrollment(id)
  const fresh = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, vyapaarWallet: true },
  })
  const walletById = new Map(fresh.map((u) => [u.id, u.vyapaarWallet]))

  const seated = room.members // already ordered by room seat
  const names = seated.map((m) => m.user.displayName || m.user.legalName)
  const openingCash = seated.map((m) => walletById.get(m.userId) ?? 0)
  const seed = crypto.randomInt(2 ** 31)
  const state = createGame(seed, names, openingCash)

  const [match] = await prisma.$transaction([
    prisma.vyapaarMatch.create({
      data: {
        roomId: room.id,
        seed: BigInt(seed),
        state: state as unknown as object,
        actionLog: [],
        status: "active",
        activeSeat: 0,
        players: {
          create: seated.map((m, i) => ({ userId: m.userId, seat: i, openingCash: openingCash[i] })),
        },
      },
      select: { id: true },
    }),
    prisma.vyapaarRoom.update({ where: { id: room.id }, data: { status: "in_game" } }),
  ])
  return { matchId: match.id }
}

/** Seats ordered best-first: score desc, then controlledSets desc, then seat asc. */
function rankSeats(state: GameState): number[] {
  return state.players
    .map((_, seat) => seat)
    .sort((a, b) => {
      const sa = scoreOf(state, a), sb = scoreOf(state, b)
      if (sb !== sa) return sb - sa
      const ca = controlledSets(state, a), cb = controlledSets(state, b)
      if (cb !== ca) return cb - ca
      return a - b
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
        vyapaarWallet: resultCash,
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
  const match = await prisma.vyapaarMatch.findUnique({
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
  if ("error" in r) return { error: r.error }

  const log = [...(match.actionLog as { seat: number; intent: Intent }[]), { seat: me.seat, intent }]
  await prisma.$transaction(async (tx) => {
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
  })
  return { view: publicView(r.state, me.seat) }
}
