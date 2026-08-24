import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { ensureVyapaarEnrollment } from "./wallet"
import { generateRoomCode, lowestFreeSeat, pickNewHost } from "./rooms-logic"
import { MAX_SEATS, ROOM_TTL_DAYS } from "@/config/vyapaar-rooms"

type Visibility = "private" | "public"

async function uniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateRoomCode()
    const clash = await prisma.vyapaarRoom.findFirst({
      where: { code, status: { in: ["open", "in_game"] } },
      select: { id: true },
    })
    if (!clash) return code
  }
  throw new Error("could not allocate a unique room code")
}

export async function createRoom(userId: string, visibility: Visibility): Promise<{ code: string }> {
  await ensureVyapaarEnrollment(userId)
  const code = await uniqueCode()
  await prisma.vyapaarRoom.create({
    data: {
      code,
      hostId: userId,
      visibility,
      status: "open",
      members: { create: { userId, seat: 0 } },
    },
  })
  return { code }
}

export async function joinRoom(userId: string, code: string): Promise<{ seat: number }> {
  await ensureVyapaarEnrollment(userId)
  return prisma.$transaction(async (tx) => {
    const room = await tx.vyapaarRoom.findUnique({
      where: { code },
      select: { id: true, status: true, members: { select: { userId: true, seat: true } } },
    })
    if (!room || room.status === "expired") throw new ForbiddenError("Room not found")
    const mine = room.members.find((m) => m.userId === userId)
    if (mine) return { seat: mine.seat } // rejoin resumes seat
    const seat = lowestFreeSeat(room.members.map((m) => m.seat))
    if (seat === null) throw new ForbiddenError("Room is full")
    await tx.vyapaarRoomMember.create({ data: { roomId: room.id, userId, seat } })
    await tx.vyapaarRoom.update({ where: { id: room.id }, data: { lastActiveAt: new Date() } })
    return { seat }
  })
}

export async function leaveRoom(userId: string, roomId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const room = await tx.vyapaarRoom.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true, members: { select: { userId: true, seat: true } } },
    })
    if (!room) return
    await tx.vyapaarRoomMember.deleteMany({ where: { roomId, userId } })
    const remaining = room.members.filter((m) => m.userId !== userId)
    if (remaining.length === 0) {
      await tx.vyapaarRoom.update({ where: { id: roomId }, data: { status: "expired", lastActiveAt: new Date() } })
      return
    }
    const data: { lastActiveAt: Date; hostId?: string } = { lastActiveAt: new Date() }
    if (room.hostId === userId) data.hostId = pickNewHost(remaining)!
    await tx.vyapaarRoom.update({ where: { id: roomId }, data })
  })
}

export async function setRoomVisibility(userId: string, roomId: string, visibility: Visibility): Promise<void> {
  const room = await prisma.vyapaarRoom.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) throw new ForbiddenError("Room not found")
  if (room.hostId !== userId) throw new ForbiddenError("Only the host can change visibility")
  await prisma.vyapaarRoom.update({ where: { id: roomId }, data: { visibility } })
}

export async function listPublicRooms() {
  const rooms = await prisma.vyapaarRoom.findMany({
    where: { status: "open", visibility: "public" },
    orderBy: { lastActiveAt: "desc" },
    select: {
      code: true,
      host: { select: { displayName: true, legalName: true } },
      _count: { select: { members: true } },
    },
    take: 50,
  })
  return rooms
    .filter((r) => r._count.members < MAX_SEATS)
    .map((r) => ({ code: r.code, host: r.host.displayName ?? r.host.legalName, seats: r._count.members }))
}

export async function getRoom(code: string) {
  return prisma.vyapaarRoom.findUnique({
    where: { code },
    select: {
      id: true, code: true, hostId: true, visibility: true, status: true,
      members: {
        orderBy: { seat: "asc" },
        select: { userId: true, seat: true, user: { select: { displayName: true, legalName: true } } },
      },
    },
  })
}

/** Mark active rooms idle past the TTL as expired. Returns the count. */
export async function sweepExpiredRooms(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - ROOM_TTL_DAYS * 86_400_000)
  const res = await prisma.vyapaarRoom.updateMany({
    where: { status: { in: ["open", "in_game"] }, lastActiveAt: { lt: cutoff } },
    data: { status: "expired" },
  })
  return res.count
}
