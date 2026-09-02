import { prisma } from "@/lib/prisma"
import { env } from "@/config/env"
import { sendNotification } from "@/modules/notifications/service"
import { isBlockedBetween, blockedIdsFor } from "@/modules/connections/blocks"
import type { Membership } from "@/lib/homepage-data"

export interface AlumniUser {
  id: string
  /** Real user UUID — used by server actions (the `id` field above is username||uuid for links). */
  userId?: string
  name: string
  headline: string
  batch: string
  house: string
  houseColor: string
  location: string
  avatar: string
  mutualCount: number
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

function monthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function mapUser(u: MappedUser, extra?: { since?: string }): AlumniUser {
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

export async function getFollowData(userId: string): Promise<{
  following: AlumniUser[]
  followers: AlumniUser[]
  suggestions: AlumniUser[]
}> {
  // Bound the joined display lists (each row pulls full profile/house/batch
  // joins) — an unbounded query on a hub user materializes hundreds of rows and
  // ships them all to the client. `allFollowingIds` is a separate join-free
  // query so the suggestion exclusion below still sees EVERY followed id, not
  // just the first page (bounding the joined list would leak already-followed
  // users into suggestions).
  const [followingRows, followerRows, allFollowingIds] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
  ])

  const following = followingRows.map((f) =>
    mapUser(f.following as MappedUser, { since: monthYear(f.createdAt) }),
  )
  const followers = followerRows.map((f) =>
    mapUser(f.follower as MappedUser, { since: monthYear(f.createdAt) }),
  )

  // Suggestions: active users I don't already follow (and haven't blocked / been blocked by).
  const blocked = await blockedIdsFor(userId)
  const followedIds = new Set<string>([userId, ...allFollowingIds.map((f) => f.followingId), ...blocked])
  const suggestionRows = await prisma.user.findMany({
    where: { status: "active", deletedAt: null, id: { notIn: Array.from(followedIds) } },
    select: userSelect,
    take: 6,
  })
  const suggestions = suggestionRows.map((u) => mapUser(u as MappedUser))

  return { following, followers, suggestions }
}

/** Ids the given user currently follows — for hydrating Follow buttons. */
export async function getFollowingIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  return new Set(rows.map((r) => r.followingId))
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) return

  // A block severs the graph both ways — neither party can (re)follow the other.
  if (await isBlockedBetween(followerId, followingId)) return

  // Only a genuinely new follow should create the row + notify (no dupes on re-follow).
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { id: true },
  })
  if (existing) return

  try {
    await prisma.follow.create({ data: { followerId, followingId } })
  } catch {
    return // lost a race — already following
  }

  // Notify the followed user (notification + email). Never let this fail the follow.
  try {
    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { username: true, displayName: true, legalName: true, profile: { select: { photoUrl: true } } },
    })
    const fromName = follower?.displayName || follower?.legalName || "Someone"
    const profileUrl = `${env.authUrl}/${follower?.username ?? followerId}`
    await sendNotification({
      userId: followingId,
      actorId: followerId,
      kind: "new_follower",
      title: `${fromName} started following you`,
      entityType: "user",
      entityId: followerId,
      imageUrl: follower?.profile?.photoUrl ?? undefined,
      email: { fromName, profileUrl },
    })
  } catch (e) {
    console.error("new_follower notification failed:", e)
  }
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await prisma.follow.deleteMany({ where: { followerId, followingId } })
}
