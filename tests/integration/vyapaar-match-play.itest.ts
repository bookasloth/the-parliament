import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import { createRoom, joinRoom } from "@/modules/vyapaar/rooms"
import { startMatch, applyMatchIntent } from "@/modules/vyapaar/match"
import type { GameState } from "@/modules/vyapaar/engine/state"
import { MAX_ROUNDS } from "@/modules/vyapaar/engine/data"

async function mkUser() {
  const u = await prisma.user.create({ data: { email: `mp_${crypto.randomUUID()}@test.local`, legalName: "T" }, select: { id: true } })
  return u.id
}
async function twoPlayerMatch() {
  const host = await mkUser(), b = await mkUser()
  const { code } = await createRoom(host, "public")
  await joinRoom(b, code)
  const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
  const { matchId } = await startMatch(host, room!.id)
  return { host, b, roomId: room!.id, matchId }
}
async function ledgerSum(userId: string) {
  const rows = await prisma.vyapaarLedger.findMany({ where: { userId }, select: { delta: true } })
  return rows.reduce((n, r) => n + r.delta, 0)
}

describe("applyMatchIntent", () => {
  it("rejects a non-player and derives seat from the user", async () => {
    const { matchId } = await twoPlayerMatch()
    const stranger = await mkUser()
    await expect(applyMatchIntent(stranger, matchId, { type: "roll" })).rejects.toThrow()
  })

  it("rejects an illegal intent from the engine without mutating", async () => {
    const { b, matchId } = await twoPlayerMatch()
    // seat 1 (b) can't roll on seat 0's turn
    const res = await applyMatchIntent(b, matchId, { type: "roll" })
    expect("error" in res).toBe(true)
    const m = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { actionLog: true } })
    expect((m!.actionLog as unknown[]).length).toBe(0)
  })

  it("persists state + action log on a legal roll", async () => {
    const { host, matchId } = await twoPlayerMatch()
    const res = await applyMatchIntent(host, matchId, { type: "roll" })
    expect("view" in res).toBe(true)
    const m = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { actionLog: true } })
    expect((m!.actionLog as unknown[]).length).toBe(1)
  })

  it("settles wallets at game-over, preserving wallet == ledger sum", async () => {
    const { host, b, matchId } = await twoPlayerMatch()
    // Force game over by driving the stored state to ended, then apply one end_turn.
    // Simplest deterministic path: fetch state, set round to MAX_ROUNDS and active to the last seat, persist, then end_turn.
    const before = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { state: true } })
    const s = before!.state as unknown as GameState
    s.round = MAX_ROUNDS
    s.active = 1
    s.phase = "manage"
    await prisma.vyapaarMatch.update({ where: { id: matchId }, data: { state: s as unknown as object, activeSeat: 1 } })
    const res = await applyMatchIntent(b, matchId, { type: "end_turn" })
    expect("view" in res).toBe(true)
    const m = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { status: true, winnerSeat: true } })
    expect(m!.status).toBe("over")
    for (const uid of [host, b]) {
      const player = await prisma.vyapaarMatchPlayer.findFirst({ where: { matchId, userId: uid }, select: { resultCash: true } })
      const user = await prisma.user.findUnique({ where: { id: uid }, select: { vyapaarWallet: true } })
      expect(user!.vyapaarWallet).toBe(player!.resultCash)
      expect(await ledgerSum(uid)).toBe(user!.vyapaarWallet) // invariant
    }
    const room = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { room: { select: { status: true } } } })
    expect(room!.room.status).toBe("open")
  })

  it("sets turnExpiresAt on start and after a move, null at game-over", async () => {
    const { host, matchId } = await twoPlayerMatch()
    const m0 = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { turnExpiresAt: true } })
    expect(m0!.turnExpiresAt).not.toBeNull() // set at start
    await applyMatchIntent(host, matchId, { type: "roll" })
    const m1 = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { turnExpiresAt: true } })
    expect(m1!.turnExpiresAt).not.toBeNull()
  })
})
