import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import { createRoom, joinRoom } from "@/modules/vyapaar/rooms"
import { startMatch, autoResolveExpiredTurns, rebuildMatchState } from "@/modules/vyapaar/match"
import type { GameState, Intent } from "@/modules/vyapaar/engine/state"

async function mkUser() {
  const u = await prisma.user.create({ data: { email: `to_${crypto.randomUUID()}@test.local`, legalName: "T" }, select: { id: true } })
  return u.id
}
async function match2() {
  const host = await mkUser(), b = await mkUser()
  const { code } = await createRoom(host, "public")
  await joinRoom(b, code)
  const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
  const { matchId } = await startMatch(host, room!.id)
  return { host, b, matchId }
}

describe("autoResolveExpiredTurns", () => {
  it("auto-plays an expired turn and advances the active seat", async () => {
    const { matchId } = await match2()
    // expire the turn
    await prisma.vyapaarMatch.update({ where: { id: matchId }, data: { turnExpiresAt: new Date(Date.now() - 1000) } })
    const before = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { activeSeat: true } })
    const n = await autoResolveExpiredTurns(new Date())
    expect(n).toBeGreaterThanOrEqual(1)
    const after = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { activeSeat: true, actionLog: true } })
    expect(after!.activeSeat).not.toBe(before!.activeSeat) // a full turn was auto-played
    expect((after!.actionLog as unknown[]).length).toBeGreaterThan(0) // auto-intents recorded
  })

  it("leaves a non-expired match untouched (stale guard)", async () => {
    const { matchId } = await match2() // turnExpiresAt ~30s in the future
    const n = await autoResolveExpiredTurns(new Date())
    const m = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { activeSeat: true, actionLog: true } })
    expect(m!.activeSeat).toBe(0)
    expect((m!.actionLog as unknown[]).length).toBe(0)
    void n
  })

  it("keeps replay determinism through auto-resolve", async () => {
    const { matchId } = await match2()
    await prisma.vyapaarMatch.update({ where: { id: matchId }, data: { turnExpiresAt: new Date(Date.now() - 1000) } })
    await autoResolveExpiredTurns(new Date())
    const m = await prisma.vyapaarMatch.findUnique({
      where: { id: matchId },
      select: { seed: true, state: true, actionLog: true, players: { orderBy: { seat: "asc" }, select: { openingCash: true, user: { select: { displayName: true, legalName: true } } } } },
    })
    const names = m!.players.map((p) => p.user.displayName || p.user.legalName)
    const openingCash = m!.players.map((p) => p.openingCash)
    const rebuilt = rebuildMatchState(Number(m!.seed), names, openingCash, m!.actionLog as { seat: number; intent: Intent }[])
    expect(rebuilt).toEqual(m!.state as unknown as GameState)
  })
})
