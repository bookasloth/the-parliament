import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import { createRoom, joinRoom } from "@/modules/vyapaar/rooms"
import { startMatch, getMatchView } from "@/modules/vyapaar/match"

async function mkUser() {
  const u = await prisma.user.create({ data: { email: `mv_${crypto.randomUUID()}@test.local`, legalName: "T" }, select: { id: true } })
  return u.id
}

describe("getMatchView", () => {
  it("returns the caller's seat-tailored publicView; rejects a non-player", async () => {
    const host = await mkUser(), b = await mkUser()
    const { code } = await createRoom(host, "public")
    await joinRoom(b, code)
    const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
    const { matchId } = await startMatch(host, room!.id)
    const hostView = await getMatchView(host, matchId)
    expect(hostView.you).toBe(0)
    expect(hostView.players).toHaveLength(2)
    const bView = await getMatchView(b, matchId)
    expect(bView.you).toBe(1)
    const stranger = await mkUser()
    await expect(getMatchView(stranger, matchId)).rejects.toThrow()
  })
})
