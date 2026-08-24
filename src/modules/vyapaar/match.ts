import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { ensureVyapaarEnrollment } from "./wallet"
import { createGame } from "./engine/state"
import type { GameState, Intent } from "./engine/state"
import { applyIntent } from "./engine/engine"
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
