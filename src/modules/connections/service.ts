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

function mapUser(u: MappedUser, extra?: { since?: string; mutualCount?: number }): AlumniUser {
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

  // Real mutual counts (audit P1-18) for every card shown, not a hardcoded 0.
  const shownIds = [
    ...followingRows.map((f) => f.following.id),
    ...followerRows.map((f) => f.follower.id),
  ]
  const listMutuals = await mutualCountsFor(userId, [...new Set(shownIds)])

  const following = followingRows.map((f) =>
    mapUser(f.following as MappedUser, { since: monthYear(f.createdAt), mutualCount: listMutuals.get(f.following.id) ?? 0 }),
  )
  const followers = followerRows.map((f) =>
    mapUser(f.follower as MappedUser, { since: monthYear(f.createdAt), mutualCount: listMutuals.get(f.follower.id) ?? 0 }),
  )

  // Suggestions: active users I don't already follow (and haven't blocked / been
  // blocked by), RANKED by mutuals + same batch/house + recency (was an arbitrary
  // 6 rows). ponytail: ranks a recent candidate pool in app code — fine to a few
  // thousand; push into SQL if the member base gets large.
  const blocked = await blockedIdsFor(userId)
  const followedIds = new Set<string>([userId, ...allFollowingIds.map((f) => f.followingId), ...blocked])
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { profile: { select: { houseId: true, batchId: true } } } })
  const myHouse = me?.profile?.houseId ?? null
  const myBatch = me?.profile?.batchId ?? null

  const candidates = await prisma.user.findMany({
    where: { status: "active", deletedAt: null, id: { notIn: Array.from(followedIds) } },
    select: { ...userSelect, profile: { select: { photoUrl: true, headline: true, city: true, houseId: true, batchId: true, house: { select: { name: true, colorHex: true } }, batch: { select: { label: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  })
  const candMutuals = await mutualCountsFor(userId, candidates.map((c) => c.id))
  const scored = candidates
    .map((c) => {
      const mutual = candMutuals.get(c.id) ?? 0
      const sameBatch = myBatch && c.profile?.batchId === myBatch ? 1 : 0
      const sameHouse = myHouse && c.profile?.houseId === myHouse ? 1 : 0
      return { c, mutual, score: mutual * 3 + sameBatch * 2 + sameHouse }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
  const suggestions = scored.map(({ c, mutual }) => mapUser(c as unknown as MappedUser, { mutualCount: mutual }))

  return { following, followers, suggestions }
}

/**
 * Mutual-connection counts (audit P1-18): for each candidate, how many people
 * BOTH the viewer and that candidate follow. Previously every card showed
 * "0 mutual" because the value was hardcoded. One grouped query over the
 * candidates' follow edges restricted to the viewer's own following set.
 */
export async function mutualCountsFor(viewerId: string, candidateIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (candidateIds.length === 0) return out
  const viewerFollowing = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } })
  const viewerSet = viewerFollowing.map((f) => f.followingId)
  if (viewerSet.length === 0) return out
  const rows = await prisma.follow.groupBy({
    by: ["followerId"],
    where: { followerId: { in: candidateIds }, followingId: { in: viewerSet } },
    _count: { followingId: true },
  })
  for (const r of rows) out.set(r.followerId, r._count.followingId)
  return out
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
