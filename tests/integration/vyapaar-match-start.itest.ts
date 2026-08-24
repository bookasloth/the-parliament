import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import { createRoom, joinRoom } from "@/modules/vyapaar/rooms"
import { startMatch } from "@/modules/vyapaar/match"
import { getVyapaarBalance } from "@/modules/vyapaar/wallet"

async function mkUser() {
  const u = await prisma.user.create({
    data: { email: `m_${crypto.randomUUID()}@test.local`, legalName: "T" },
    select: { id: true },
  })
  return u.id
}
async function roomWith(n: number) {
  const host = await mkUser()
  const { code } = await createRoom(host, "public")
  const others: string[] = []
  for (let i = 1; i < n; i++) {
    const u = await mkUser()
    await joinRoom(u, code)
    others.push(u)
  }
  const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
  return { host, others, roomId: room!.id }
}

describe("startMatch", () => {
  it("host starts, snapshots each wallet as opening cash, seats are contiguous, room in_game", async () => {
    const { host, others, roomId } = await roomWith(3)
    const hostBal = await getVyapaarBalance(host)
    const { matchId } = await startMatch(host, roomId)
    const players = await prisma.vyapaarMatchPlayer.findMany({
      where: { matchId }, orderBy: { seat: "asc" }, select: { userId: true, seat: true, openingCash: true },
    })
    expect(players.map((p) => p.seat)).toEqual([0, 1, 2])
    expect(players[0].userId).toBe(host)
    expect(players[0].openingCash).toBe(hostBal)
    const match = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { status: true, activeSeat: true } })
    expect(match).toMatchObject({ status: "active", activeSeat: 0 })
    const room = await prisma.vyapaarRoom.findUnique({ where: { id: roomId }, select: { status: true } })
    expect(room!.status).toBe("in_game")
    void others
  })

  it("rejects a non-host starter", async () => {
    const { others, roomId } = await roomWith(2)
    await expect(startMatch(others[0], roomId)).rejects.toThrow()
  })

  it("rejects a solo room (<2 members)", async () => {
    const host = await mkUser()
    const { code } = await createRoom(host, "public")
    const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
    await expect(startMatch(host, room!.id)).rejects.toThrow()
  })

  it("one-active-match: blocks starting when a member is already in an active match", async () => {
    const { host, others, roomId } = await roomWith(2)
    await startMatch(host, roomId) // host + others[0] now in a game
    // others[0] hosts a second room with a fresh player, tries to start → blocked (already in a game)
    const fresh = await mkUser()
    const { code } = await createRoom(others[0], "public")
    await joinRoom(fresh, code)
    const room2 = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
    await expect(startMatch(others[0], room2!.id)).rejects.toThrow(/already in a game/i)
  })
})
