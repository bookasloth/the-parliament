import { prisma } from "@/lib/prisma"
import type { Membership } from "@/lib/homepage-data"

export interface AlumniUser {
  id: string
  /** Real user UUID — used by server actions (the `id` field above is username||uuid for links). */
  userId?: string
  /** Connection row id — present on pending/received so accept/reject can target it. */
  connectionId?: string
  name: string
  headline: string
  batch: string
  house: string
  houseColor: string
  location: string
  avatar: string
  mutualCount: number
  sentAt?: string
  since?: string
  borderColor: string
  membership: Membership
}

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  legalName: true,
  membershipStatus: true,
  isVerified: true,
  profile: {
    select: {
      photoUrl: true,
      headline: true,
      city: true,
      house: { select: { name: true, colorHex: true } },
      batch: { select: { label: true } },
    },
  },
} as const

type MappedUser = {
  id: string
  username: string | null
  displayName: string
  legalName: string
  membershipStatus: string
  profile: {
    photoUrl: string | null
    headline: string | null
    city: string | null
    house: { name: string; colorHex: string } | null
    batch: { label: string } | null
  } | null
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const day = 1000 * 60 * 60 * 24
  const days = Math.floor(diffMs / day)
  if (days <= 0) return "today"
  if (days === 1) return "1 day ago"
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return "1 week ago"
  if (weeks < 5) return `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  if (months <= 1) return "1 month ago"
  return `${months} months ago`
}

function monthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function mapUser(
  u: MappedUser,
  extra?: { sentAt?: string; since?: string; connectionId?: string },
): AlumniUser {
  const name = u.displayName || u.legalName
  const houseColor = u.profile?.house?.colorHex ?? "#94a3b8"
  const avatar =
    u.profile?.photoUrl ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
  return {
    id: u.username || u.id,
    userId: u.id,
    name,
    headline: u.profile?.headline ?? "",
    batch: u.profile?.batch?.label ?? "",
    house: u.profile?.house?.name ?? "",
    houseColor,
    location: u.profile?.city ?? "",
    avatar,
    mutualCount: 0,
    borderColor: houseColor,
    membership: u.membershipStatus as Membership,
    ...extra,
  }
}

export async function getConnectionsData(userId: string): Promise<{
  connected: AlumniUser[]
  pending: AlumniUser[]
  received: AlumniUser[]
  suggestions: AlumniUser[]
}> {
  const [acceptedRows, sentRows, receivedRows, anyRelations] = await Promise.all([
    prisma.connection.findMany({
      where: {
        status: "accepted",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: { requester: { select: userSelect }, addressee: { select: userSelect } },
    }),
    prisma.connection.findMany({
      where: { requesterId: userId, status: "pending" },
      include: { addressee: { select: userSelect } },
    }),
    prisma.connection.findMany({
      where: { addresseeId: userId, status: "pending" },
      include: { requester: { select: userSelect } },
    }),
    prisma.connection.findMany({
      where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    }),
  ])

  const connected = acceptedRows.map((c) => {
    const other = c.requesterId === userId ? c.addressee : c.requester
    return mapUser(other as MappedUser, { since: monthYear(c.respondedAt ?? c.createdAt) })
  })

  const pending = sentRows.map((c) =>
    mapUser(c.addressee as MappedUser, { sentAt: relativeTime(c.createdAt), connectionId: c.id }),
  )

  const received = receivedRows.map((c) =>
    mapUser(c.requester as MappedUser, { sentAt: relativeTime(c.createdAt), connectionId: c.id }),
  )

  const relatedIds = new Set<string>([userId])
  for (const r of anyRelations) {
    relatedIds.add(r.requesterId)
    relatedIds.add(r.addresseeId)
  }

  const suggestionRows = await prisma.user.findMany({
    where: {
      status: "active",
      deletedAt: null,
      id: { notIn: Array.from(relatedIds) },
    },
    select: userSelect,
    take: 6,
  })

  const suggestions = suggestionRows.map((u) => mapUser(u as MappedUser))

  return { connected, pending, received, suggestions }
}

export async function sendConnectionRequest(
  requesterId: string,
  addresseeId: string,
): Promise<void> {
  if (requesterId === addresseeId) return

  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
    select: { id: true },
  })
  if (existing) return

  await prisma.connection.create({
    data: { requesterId, addresseeId, status: "pending" },
  })
}

export async function respondToConnection(
  userId: string,
  connectionId: string,
  accept: boolean,
): Promise<void> {
  const conn = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { addresseeId: true },
  })
  if (!conn || conn.addresseeId !== userId) return

  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: accept ? "accepted" : "rejected",
      respondedAt: new Date(),
    },
  })
}
