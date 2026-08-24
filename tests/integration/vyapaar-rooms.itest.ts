import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import {
  createRoom, joinRoom, leaveRoom, setRoomVisibility, listPublicRooms, getRoom, sweepExpiredRooms,
} from "@/modules/vyapaar/rooms"

async function mkUser() {
  const u = await prisma.user.create({
    data: { email: `room_${crypto.randomUUID()}@test.local`, legalName: "T" },
    select: { id: true },
  })
  return u.id
}

describe("vyapaar rooms", () => {
  it("create makes the host seat 0", async () => {
    const host = await mkUser()
    const { code } = await createRoom(host, "public")
    expect(code).toHaveLength(6)
    const room = await getRoom(code)
    expect(room!.hostId).toBe(host)
    expect(room!.members.find((m) => m.userId === host)!.seat).toBe(0)
  })

  it("join fills the lowest free seat and rejoin resumes the seat", async () => {
    const host = await mkUser(), a = await mkUser(), b = await mkUser()
    const { code } = await createRoom(host, "public")
    expect((await joinRoom(a, code)).seat).toBe(1)
    expect((await joinRoom(b, code)).seat).toBe(2)
    expect((await joinRoom(a, code)).seat).toBe(1) // rejoin, no new seat
    const room = await getRoom(code)
    expect(room!.members).toHaveLength(3)
  })

  it("rejects the 7th player", async () => {
    const host = await mkUser()
    const { code } = await createRoom(host, "public")
    for (let i = 0; i < 5; i++) await joinRoom(await mkUser(), code)
    await expect(joinRoom(await mkUser(), code)).rejects.toThrow(/full/i)
  })

  it("leaving frees a seat; host handoff promotes lowest seat; empty room expires", async () => {
    const host = await mkUser(), a = await mkUser()
    const { code } = await createRoom(host, "public")
    await joinRoom(a, code)
    let room = await getRoom(code)
    await leaveRoom(host, room!.id) // host leaves → a (seat 1) becomes host
    room = await getRoom(code)
    expect(room!.hostId).toBe(a)
    await leaveRoom(a, room!.id) // last member leaves → expired
    room = await getRoom(code)
    expect(room!.status).toBe("expired")
  })

  it("public lobby lists only open public non-full rooms", async () => {
    const h1 = await mkUser(), h2 = await mkUser()
    const pub = await createRoom(h1, "public")
    await createRoom(h2, "private")
    const codes = (await listPublicRooms()).map((r) => r.code)
    expect(codes).toContain(pub.code)
  })

  it("visibility change is host-only", async () => {
    const host = await mkUser(), a = await mkUser()
    const { code } = await createRoom(host, "private")
    const room = await getRoom(code)
    await joinRoom(a, code)
    await expect(setRoomVisibility(a, room!.id, "public")).rejects.toThrow()
    await setRoomVisibility(host, room!.id, "public")
    expect((await getRoom(code))!.visibility).toBe("public")
  })

  it("sweep expires an inactive room, leaves a fresh one", async () => {
    const h1 = await mkUser(), h2 = await mkUser()
    const stale = await createRoom(h1, "public")
    const fresh = await createRoom(h2, "public")
    const staleRoom = await getRoom(stale.code)
    await prisma.vyapaarRoom.update({
      where: { id: staleRoom!.id },
      data: { lastActiveAt: new Date(Date.now() - 31 * 86_400_000) },
    })
    const n = await sweepExpiredRooms(new Date())
    expect(n).toBeGreaterThanOrEqual(1)
    expect((await getRoom(stale.code))!.status).toBe("expired")
    expect((await getRoom(fresh.code))!.status).toBe("open")
  })
})
