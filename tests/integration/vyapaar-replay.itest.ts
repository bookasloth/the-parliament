import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import { createRoom, joinRoom } from "@/modules/vyapaar/rooms"
import { startMatch, applyMatchIntent, rebuildMatchState } from "@/modules/vyapaar/match"
import type { GameState, Intent } from "@/modules/vyapaar/engine/state"

async function mkUser() {
  const u = await prisma.user.create({ data: { email: `rp_${crypto.randomUUID()}@test.local`, legalName: "T" }, select: { id: true } })
  return u.id
}

describe("match replay determinism", () => {
  it("rebuild(seed,names,openingCash,log) equals the stored state", async () => {
    const host = await mkUser(), b = await mkUser()
    const { code } = await createRoom(host, "public")
    await joinRoom(b, code)
    const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
    const { matchId } = await startMatch(host, room!.id)

    // Drive a few legal turns using each state's active player.
    for (let i = 0; i < 8; i++) {
      const m = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { state: true, status: true } })
      if (m!.status !== "active") break
      const s = m!.state as unknown as GameState
      const seatUser = s.active === 0 ? host : b
      const intent: Intent = s.phase === "roll" ? { type: "roll" } : s.phase === "buy" ? { type: "decline" } : s.phase === "auction" ? { type: "bid", amount: 0 } : { type: "end_turn" }
      const actor = s.phase === "auction" ? (s.auction!.bids.findIndex((x) => x === null) === 0 ? host : b) : seatUser
      await applyMatchIntent(actor, matchId, intent)
    }

    const final = await prisma.vyapaarMatch.findUnique({
      where: { id: matchId },
      select: { seed: true, state: true, actionLog: true, players: { orderBy: { seat: "asc" }, select: { openingCash: true, user: { select: { displayName: true, legalName: true } } } } },
    })
    const names = final!.players.map((p) => p.user.displayName || p.user.legalName)
    const openingCash = final!.players.map((p) => p.openingCash)
    const rebuilt = rebuildMatchState(Number(final!.seed), names, openingCash, final!.actionLog as { seat: number; intent: Intent }[])
    // Postgres JSONB reorders object keys on storage (length-then-lex), so the
    // DB-read state has different key insertion order than a freshly-built
    // object even when every value matches — toEqual does structural
    // (order-independent) deep equality, toBe(JSON.stringify(...)) does not.
    expect(rebuilt).toEqual(final!.state)
  })
})
