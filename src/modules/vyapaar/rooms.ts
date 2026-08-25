import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { ensureVyapaarEnrollment } from "./wallet"
import { generateRoomCode, lowestFreeSeat, pickNewHost } from "./rooms-logic"
import { MAX_SEATS, ROOM_TTL_DAYS } from "@/config/vyapaar-rooms"
import { broadcastToTopic, roomTopic } from "@/lib/supabase-realtime"

// Fire-and-forget lobby ping so every member's room page updates live (join/leave/visibility).
function pingLobby(roomId: string): void {
  void broadcastToTopic(roomTopic(roomId), "lobby", {}).catch(() => {})
}

type Visibility = "private" | "public"

function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { code?: string }).code === "P2002"
}

export async function createRoom(userId: string, visibility: Visibility): Promise<{ code: string }> {
  await ensureVyapaarEnrollment(userId)
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateRoomCode()
    try {
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
    } catch (e) {
      // code is globally @unique — a clash (incl. a long-expired room, or a
      // concurrent create) means retry with a fresh code, not a pre-check.
      if (!isUniqueViolation(e) || attempt === 5) throw e
    }
  }
  throw new Error("could not allocate a unique room code")
}

export async function joinRoom(userId: string, code: string): Promise<{ seat: number }> {
  await ensureVyapaarEnrollment(userId)
  // Two concurrent joins can compute the same lowestFreeSeat and race the
  // [roomId, seat] unique constraint. Postgres aborts the whole transaction
  // on that error (25P02, no savepoints here) — so each retry must be a
  // fresh $transaction, not a re-read inside the failed one.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await prisma.$transaction(async (tx) => {
        const room = await tx.vyapaarRoom.findUnique({
          where: { code },
          select: { id: true, status: true, members: { select: { userId: true, seat: true } } },
        })
        if (!room || room.status === "expired") throw new ForbiddenError("Room not found")
        const mine = room.members.find((m) => m.userId === userId)
        if (mine) {
          await tx.vyapaarRoom.update({ where: { id: room.id }, data: { lastActiveAt: new Date() } })
          return { seat: mine.seat, roomId: room.id } // rejoin resumes seat
        }
        const seat = lowestFreeSeat(room.members.map((m) => m.seat))
        if (seat === null) throw new ForbiddenError("Room is full")
        await tx.vyapaarRoomMember.create({ data: { roomId: room.id, userId, seat } })
        await tx.vyapaarRoom.update({ where: { id: room.id }, data: { lastActiveAt: new Date() } })
        return { seat, roomId: room.id }
      })
      pingLobby(res.roomId)
      return { seat: res.seat }
    } catch (e) {
      if (isUniqueViolation(e) && attempt < 2) continue // lost the seat race; retry with a fresh transaction
      throw e
    }
  }
  throw new ForbiddenError("Room is full")
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
  pingLobby(roomId)
}

export async function setRoomVisibility(userId: string, roomId: string, visibility: Visibility): Promise<void> {
  // Atomic check-and-update: a findUnique-then-update would race a concurrent
  // host handoff and let a stale host slip through between the two calls.
  const res = await prisma.vyapaarRoom.updateMany({ where: { id: roomId, hostId: userId }, data: { visibility } })
  if (res.count === 0) throw new ForbiddenError("Only the host can change visibility")
  pingLobby(roomId)
}

export async function listPublicRooms() {
  // ponytail: JS-filter full rooms after take:100 — fine at launch scale; add
  // a denormalized seatCount column + where-filter if public-room volume grows.
  const rooms = await prisma.vyapaarRoom.findMany({
    where: { status: "open", visibility: "public" },
    orderBy: { lastActiveAt: "desc" },
    select: {
      code: true,
      host: { select: { displayName: true, legalName: true } },
      _count: { select: { members: true } },
    },
    take: 100,
  })
  return rooms
    .filter((r) => r._count.members < MAX_SEATS)
    .map((r) => ({ code: r.code, host: r.host.displayName || r.host.legalName, seats: r._count.members }))
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
