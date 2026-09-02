import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { colorAvatar } from "@/lib/avatar"

// Canonical home for the block relationship. Blocking is SYMMETRIC + TOTAL
// (product decision 2026-09-02): once A blocks B, neither sees the other on ANY
// surface — feed, profile, directory, comments, mentions, follow, notifications.
// `UserBlock` stores one directional row (blocker→blocked); every read here
// treats it symmetrically.

/** Block `otherId`. Idempotent. */
export async function blockUser(viewerId: string, otherId: string): Promise<void> {
  if (viewerId === otherId) throw new ForbiddenError("Cannot block yourself")
  await prisma.$transaction([
    prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: viewerId, blockedId: otherId } },
      create: { blockerId: viewerId, blockedId: otherId },
      update: {},
    }),
    // A block severs the graph both ways so neither shows in the other's feed
    // affinity, followers list, or "message your connections" gate.
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: viewerId, followingId: otherId },
          { followerId: otherId, followingId: viewerId },
        ],
      },
    }),
  ])
}

/** Remove a block the viewer created. Idempotent. */
export async function unblockUser(viewerId: string, otherId: string): Promise<void> {
  await prisma.userBlock.deleteMany({ where: { blockerId: viewerId, blockedId: otherId } })
}

/** True if EITHER user has blocked the other. */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const row = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { blockerId: true },
  })
  return !!row
}

/**
 * Every userId in a block relation with the viewer, in EITHER direction — the
 * set to exclude from any list the viewer sees (directory, comments, mentions,
 * suggestions). Empty set when the viewer isn't logged in.
 */
export async function blockedIdsFor(viewerId: string | undefined | null): Promise<Set<string>> {
  if (!viewerId) return new Set()
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  })
  const out = new Set<string>()
  for (const r of rows) out.add(r.blockerId === viewerId ? r.blockedId : r.blockerId)
  return out
}

export interface BlockedUserRow {
  id: string
  username: string | null
  name: string
  photoUrl: string
}

/** Users the viewer has blocked (for the settings "Blocked accounts" list). */
export async function listBlockedUsers(viewerId: string): Promise<BlockedUserRow[]> {
  const rows = await prisma.userBlock.findMany({
    where: { blockerId: viewerId },
    orderBy: { createdAt: "desc" },
    select: {
      blockedId: true,
      blocked: { select: { id: true, username: true, displayName: true, legalName: true, profile: { select: { photoUrl: true } } } },
    },
  })
  return rows.map((r) => ({
    id: r.blocked.id,
    username: r.blocked.username,
    name: r.blocked.displayName || r.blocked.legalName,
    photoUrl: r.blocked.profile?.photoUrl || colorAvatar(r.blocked.id),
  }))
}
