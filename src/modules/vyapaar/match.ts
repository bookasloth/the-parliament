import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { ForbiddenError } from "@/lib/errors"
import { ensureVyapaarEnrollment } from "./wallet"
import { createGame } from "./engine/state"
import type { GameState, Intent } from "./engine/state"
import { applyIntent, nextAutoIntent, rankSeats, forceEndGame } from "./engine/engine"
import { publicView, type PublicView } from "./engine/view"
import { netWorth } from "./engine/helpers"
import { capitalGainsTax } from "./tax"
import { broadcastToTopic, matchTopic, roomTopic } from "@/lib/supabase-realtime"
import { TURN_SECONDS, AUCTION_SECONDS } from "@/config/vyapaar-match"
import { stampNewTrades, sweepExpiredTrades } from "./engine/trade-expiry"
import { stampNewPayments, sweepExpiredPayments } from "./engine/payment-expiry"
import { driveBots, isBotUserId, botOpeningCash } from "./bot"
import crypto from "node:crypto"

// Hard wall-clock cap: a game force-ends 60 minutes after it was created, whichever of
// {round cap, this, last-player-standing} comes first. Enforced server-side (the engine
// has no clock) on the next action or the turn-timer cron.
export const GAME_TIME_LIMIT_MS = 60 * 60 * 1000
const gameEndsAt = (createdAt: Date) => new Date(createdAt.getTime() + GAME_TIME_LIMIT_MS)

/** Deadline for the next player action; null once the game has ended. An auction adds
 *  AUCTION_SECONDS on top of the turn clock so everyone has time to bid. */
function turnExpiresAtFor(state: GameState, nowMs: number): Date | null {
  if (state.ended) return null
  const secs = state.phase === "auction" ? TURN_SECONDS + AUCTION_SECONDS : TURN_SECONDS
  return new Date(nowMs + secs * 1000)
}

/** Latest match for a room + its per-player results, for the settlements screen. */
export async function getRoomSettlement(code: string) {
  const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true, code: true } })
  if (!room) return null
  const match = await prisma.vyapaarMatch.findFirst({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, status: true, winnerSeat: true, endedAt: true, state: true,
      players: {
        orderBy: { seat: "asc" },
        select: {
          seat: true, openingCash: true, resultCash: true, placement: true,
          user: { select: { displayName: true, legalName: true } },
        },
      },
    },
  })
  if (!match) return null
  const state = match.state as unknown as GameState
  // Attach each seat's pre-tax in-game cash + the capital-gains tax withheld, for the breakdown.
  const players = match.players.map((p) => {
    const preTaxCash = state.players[p.seat]?.cash ?? p.resultCash ?? p.openingCash
    return { ...p, preTaxCash, tax: capitalGainsTax(preTaxCash - p.openingCash) }
  })
  // Seat-independent full view (net worth, cities, companies) for the results breakdown.
  const resultsView = publicView(state, 0)
  return { code: room.code, status: match.status, winnerSeat: match.winnerSeat, endedAt: match.endedAt, players, resultsView }
}

export async function activeMatchId(roomId: string): Promise<string | null> {
  const match = await prisma.vyapaarMatch.findFirst({ where: { roomId, status: "active" }, select: { id: true } })
  return match?.id ?? null
}

export async function getMatchView(
  userId: string,
  matchId: string,
): Promise<{ view: PublicView; turnExpiresAt: string | null; gameEndsAt: string | null }> {
  const match = await prisma.vyapaarMatch.findUnique({
    where: { id: matchId },
    select: { state: true, turnExpiresAt: true, createdAt: true, players: { select: { userId: true, seat: true } } },
  })
  if (!match) throw new ForbiddenError("Match not found")
  const me = match.players.find((p) => p.userId === userId)
  if (!me) throw new ForbiddenError("not_a_player")
  const state = match.state as unknown as GameState
  const view = publicView(state, me.seat)
  // Hide trades already past their deadline (state cleanup happens on the next intent/cron).
  const now = Date.now()
  view.trades = view.trades.filter((t) => !t.expiresAt || t.expiresAt > now)
  return {
    view,
    turnExpiresAt: match.turnExpiresAt?.toISOString() ?? null,
    gameEndsAt: state.ended ? null : gameEndsAt(match.createdAt).toISOString(),
  }
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
  // Bots have no real wallet to enrol — only humans go through enrollment.
  await Promise.all(memberIds.filter((id) => !isBotUserId(id)).map(ensureVyapaarEnrollment))

  const res = await prisma.$transaction(async (tx) => {
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
      // resultCash != null ⇒ already settled out (left/finished) — not actually busy.
      where: { userId: { in: room.members.map((m) => m.userId) }, match: { status: "active" }, resultCash: null },
      select: { user: { select: { displayName: true, legalName: true } } },
    })
    if (busy) throw new ForbiddenError(`${busy.user.displayName || busy.user.legalName} is already in a game`)

    const seated = room.members
    const names = seated.map((m) => m.user.displayName || m.user.legalName)
    // Bots play off a fixed stack (they never settle to a real wallet); humans use their coins.
    const openingCash = seated.map((m) => (isBotUserId(m.userId) ? botOpeningCash(m.userId) : m.user.vyapaarWallet))
    const botSeats = new Set(seated.map((m, i) => ({ m, i })).filter((x) => isBotUserId(x.m.userId)).map((x) => x.i))
    const seed = crypto.randomInt(2 ** 31)
    const state = createGame(seed, names, openingCash)
    // If the opening seat(s) are bots, play them out immediately so a human never waits on a bot.
    const botSteps = driveBots(state, botSeats)
    const match = await tx.vyapaarMatch.create({
      data: {
        roomId: room.id, seed: BigInt(seed), state: state as unknown as object, actionLog: botSteps as unknown as object,
        status: "active", activeSeat: state.active, turnExpiresAt: turnExpiresAtFor(state, Date.now()),
        players: { create: seated.map((m, i) => ({ userId: m.userId, seat: i, openingCash: openingCash[i] })) },
      },
      select: { id: true },
    })
    await tx.vyapaarRoom.update({ where: { id: room.id }, data: { status: "in_game" } })
    return { matchId: match.id }
  })
  // Push every room member into the match screen the moment the host starts.
  void broadcastToTopic(roomTopic(roomId), "started", { matchId: res.matchId }).catch(() => {})
  return res
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

  // Players who left mid-game were already paid out + wallet-credited (settleLeaver stamps
  // resultCash). Re-crediting them here would double-pay, so only finalize their placement.
  const rows = await tx.vyapaarMatchPlayer.findMany({ where: { matchId }, select: { seat: true, resultCash: true } })
  const alreadySettled = new Set(rows.filter((r) => r.resultCash !== null).map((r) => r.seat))

  for (const p of players) {
    if (alreadySettled.has(p.seat)) {
      await tx.vyapaarMatchPlayer.update({
        where: { matchId_seat: { matchId, seat: p.seat } },
        data: { placement: placementBySeat.get(p.seat)! },
      })
      continue
    }
    // Wallet banks the full NET WORTH — the headline empire value shown on the results
    // page (cash + property/sets ×1.4 + companies + development ×1.5). Winning a big board
    // pays off in coins, which funds your next games. Deliberately generous / positive-sum:
    // the ×1.4/×1.5 premiums mint coins, so total supply grows over time (owner's call).
    const finalNetWorth = Math.round(netWorth(state, p.seat))
    const resultCash = finalNetWorth
    await tx.vyapaarMatchPlayer.update({
      where: { matchId_seat: { matchId, seat: p.seat } },
      data: { resultCash, placement: placementBySeat.get(p.seat)! },
    })
    // Bots carry no real wallet/ledger/stats — record their placement above, but never mint coins.
    if (isBotUserId(p.userId)) continue
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
    await tx.user.updateMany({
      where: { id: p.userId, vyapaarBestNetWorth: { lt: finalNetWorth } },
      data: { vyapaarBestNetWorth: finalNetWorth },
    })
  }
}

/**
 * Settle one seat the moment they leave a still-running game: pay their (already
 * liquidated) cash to their wallet and stamp resultCash so they're freed from the
 * "in a game?" guard and can join another match immediately. Placement is filled in
 * later when the match actually ends (settleMatch skips their wallet/ledger by then).
 */
async function settleLeaver(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  matchId: string,
  state: GameState,
  p: { userId: string; seat: number; openingCash: number },
): Promise<void> {
  // Same capital-gains withholding as end-of-game settlement (see settleMatch).
  const resultCash = state.players[p.seat].cash - capitalGainsTax(state.players[p.seat].cash - p.openingCash)
  const delta = resultCash - p.openingCash
  await tx.vyapaarMatchPlayer.update({
    where: { matchId_seat: { matchId, seat: p.seat } },
    data: { resultCash },
  })
  if (isBotUserId(p.userId)) return // bots record resultCash but never touch a real wallet
  await tx.vyapaarLedger.create({
    data: { userId: p.userId, delta, reason: "game_leave", refId: matchId },
  })
  await tx.user.update({
    where: { id: p.userId },
    data: { vyapaarWallet: { increment: delta }, vyapaarGamesPlayed: { increment: 1 } },
  })
  const nw = Math.round(netWorth(state, p.seat))
  await tx.user.updateMany({
    where: { id: p.userId, vyapaarBestNetWorth: { lt: nw } },
    data: { vyapaarBestNetWorth: nw },
  })
}

/**
 * Persist the post-intent state, advance the turn deadline, and settle the match if it
 * just ended. Shared by applyMatchIntent (and future intent-producing paths, e.g. the
 * turn-timer cron) so every write path stamps turnExpiresAt and settles the same way.
 */
async function commitMatchState(
  tx: Prisma.TransactionClient,
  match: { id: string; roomId: string; actionLog: unknown; turnExpiresAt: Date | null; players: { userId: string; seat: number; openingCash: number }[] },
  state: GameState,
  appendedLog: { seat: number; intent: Intent }[],
  resetTimer: boolean,
): Promise<Date | null> {
  // Stamp each step with the wall-clock time it was persisted (engine has no clock). Enables
  // post-hoc analysis: payment latency, turn duration, who dawdles. Replay ignores `t`.
  const nowMs = Date.now()
  const stamped = appendedLog.map((s) => ({ ...s, t: nowMs }))
  const log = [...(match.actionLog as { seat: number; intent: Intent; t?: number }[]), ...stamped]
  // Only refresh the 30s deadline when the ACTIVE player's turn actually advanced. An
  // off-turn trade/bid from a non-active seat must NOT extend the active player's clock —
  // otherwise two colluders could keep resetting it and stall an AFK player forever.
  const expiresAt = state.ended ? null : resetTimer ? turnExpiresAtFor(state, Date.now()) : match.turnExpiresAt
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
    // Game over: discard the room. Mark it ended (blocks any rejoin — joinRoom requires
    // status "open") and clear its members so everyone is thrown out. The match row stays
    // so the results/settlement page keeps working.
    await tx.vyapaarRoom.update({ where: { id: match.roomId }, data: { status: "ended" } })
    await tx.vyapaarRoomMember.deleteMany({ where: { roomId: match.roomId } })
  } else {
    // Pay out anyone who left in this batch right away so they can jump into another game.
    for (const { seat, intent } of appendedLog) {
      if (intent.type !== "leave_game") continue
      const p = match.players.find((pp) => pp.seat === seat)
      if (p) await settleLeaver(tx, match.id, state, p)
    }
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
        id: true, roomId: true, status: true, state: true, actionLog: true, turnExpiresAt: true, createdAt: true,
        players: { select: { userId: true, seat: true, openingCash: true } },
      },
    })
    if (!match || match.status !== "active") throw new ForbiddenError("Match not found")
    const me = match.players.find((p) => p.userId === userId)
    if (!me) throw new ForbiddenError("not_a_player")

    const state = match.state as unknown as GameState
    // 60-minute wall-clock cap: if the game has run over time, end it now (by net-worth
    // ranking) whatever the incoming intent was, then settle + discard the room.
    if (!state.ended && Date.now() - match.createdAt.getTime() > GAME_TIME_LIMIT_MS) {
      const evs = forceEndGame(state)
      state.log = [...(state.log ?? []), ...evs].slice(-40)
      const expiresAt = await commitMatchState(tx, match, state, [], false)
      return { view: publicView(state, me.seat), turnExpiresAt: expiresAt }
    }
    const activeBefore = state.active
    // Clear any trades past their 60s deadline before applying the new intent.
    const now = Date.now()
    const expired = [...sweepExpiredTrades(state, now), ...sweepExpiredPayments(state, now)]
    const r = applyIntent(state, me.seat, intent)
    if ("error" in r) return { error: r.error } // no writes done; the row lock releases on commit
    // Play out any bot seats the move handed the turn to, so humans never wait on a bot.
    const botSeats = new Set(match.players.filter((p) => isBotUserId(p.userId)).map((p) => p.seat))
    const botSteps = driveBots(r.state, botSeats)
    stampNewTrades(r.state, now) // give any just-proposed/countered trade its 60s clock
    stampNewPayments(r.state, now) // and any just-queued auto-payment its 10s clock

    // Refresh the deadline only when the active player's turn advanced — an off-turn
    // trade/bid (non-active seat, same active player) must not reset the clock.
    const resetTimer = me.seat === activeBefore || r.state.active !== activeBefore
    const expiresAt = await commitMatchState(tx, match, r.state, [...expired, { seat: me.seat, intent }, ...botSteps], resetTimer)
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
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "vyapaar_match" WHERE id = ${id}::uuid FOR UPDATE`
      const match = await tx.vyapaarMatch.findUnique({
        where: { id },
        select: { id: true, roomId: true, status: true, state: true, actionLog: true, turnExpiresAt: true, createdAt: true, players: { select: { userId: true, seat: true, openingCash: true } } },
      })
      // Stale guard: a real move may have advanced the turn between the query and the lock.
      if (!match || match.status !== "active" || !match.turnExpiresAt || match.turnExpiresAt > now) return null
      const state = match.state as unknown as GameState
      // 60-minute cap for idle games: end it now instead of auto-playing to the round cap.
      if (!state.ended && now.getTime() - match.createdAt.getTime() > GAME_TIME_LIMIT_MS) {
        const evs = forceEndGame(state)
        state.log = [...(state.log ?? []), ...evs].slice(-40)
        await commitMatchState(tx, match, state, [], false)
        return { activeSeat: state.active, ended: true }
      }
      const startSeat = state.active
      const appended: { seat: number; intent: Intent }[] = []
      appended.push(...sweepExpiredTrades(state, now.getTime())) // clear expired trades too
      appended.push(...sweepExpiredPayments(state, now.getTime())) // and auto-resolve overdue payments
      const botSeats = new Set(match.players.filter((p) => isBotUserId(p.userId)).map((p) => p.seat))
      let guard = 0
      while (!state.ended && state.active === startSeat && guard++ < 40) {
        const step = nextAutoIntent(state)
        if (!step) break
        const r = applyIntent(state, step.seat, step.intent)
        if ("error" in r) break // defensive: a non-advancing auto-step would otherwise busy-loop
        appended.push(step)
      }
      // Once the timed-out turn is unstuck, play out any bot seats that now hold the turn.
      appended.push(...driveBots(state, botSeats))
      if (appended.length === 0) return null
      stampNewPayments(state, now.getTime()) // an auto-played landing may have queued payments
      // Auto-resolve always plays a full turn (loops until active changes or ended), so the
      // active player's turn has advanced → refresh the deadline for the next seat.
      await commitMatchState(tx, match, state, appended, true)
      return { activeSeat: state.active, ended: state.ended }
    }, { timeout: 15000 }) // settlement is ~24 sequential queries for a 6-player game; default 5s risks a prod rollback
    if (result) {
      await broadcastToTopic(matchTopic(id), "state", { activeSeat: result.activeSeat, ended: result.ended })
      resolved++
    }
  }
  return resolved
}
