import { prisma } from "@/lib/prisma"
import { relativeTime } from "@/lib/relative-time"

/** Group shape consumed by the groups list client page. */
export interface GroupListItem {
  id: string
  slug: string
  name: string
  description: string
  members: number
  privacy: "public" | "private"
  category: string
  cover: string
  icon: string
  isJoined: boolean
  lastActivity: string
  postsThisWeek: number
  isFeatured: boolean
}

/** Emoji icon per group type — the list/detail pages render `icon` as plain text. */
const TYPE_ICON: Record<string, string> = {
  interest: "⭐",
  custom: "👥",
  batch: "🎓",
  house: "🏠",
  department: "🏢",
  gender: "🫂",
  blood: "🩸",
}

function iconForType(type: string): string {
  return TYPE_ICON[type] ?? "👥"
}

function relative(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return "recently"
}

/**
 * Shared, non-per-viewer group list (isJoined=false baseline). Safe to cache
 * across viewers; the per-user membership overlay comes from `myGroupIds`.
 */
export async function listGroupsShared(schoolId: string): Promise<GroupListItem[]> {
  const groups = await prisma.group.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: { where: { status: "active" } } } },
    },
  })

  return groups.map((g): GroupListItem => ({
    id: g.id,
    slug: g.id,
    name: g.name,
    description: g.description ?? "",
    members: g._count.members,
    privacy: g.visibility === "private" ? "private" : "public",
    category: g.type,
    cover: g.bannerUrl ?? "",
    icon: iconForType(g.type),
    isJoined: false,
    lastActivity: relative(g.createdAt),
    postsThisWeek: 0,
    isFeatured: false,
  }))
}

// ── Member-facing group detail page ──

export interface GroupPageMember {
  id: string
  name: string
  photoUrl: string | null
  yearsLabel: string | null
  role: string
  isVerified: boolean
}
export interface GroupContributor {
  id: string
  name: string
  photoUrl: string | null
  karma: number
}
export interface GroupPageData {
  id: string
  name: string
  icon: string
  category: string
  privacy: "public" | "private"
  isOfficial: boolean
  memberCount: number
  isJoined: boolean
  canSeeAll: boolean
  members: GroupPageMember[]
  recentJoinNames: string[]
  topContributors: GroupContributor[]
  acceptedTags: string[]
  newMembers: { id: string; name: string; photoUrl: string | null }[]
  newMemberCount: number
}

function yearsLabel(batch: { startYear: number; endYear: number } | null): string | null {
  return batch ? `${batch.startYear}–${batch.endYear}` : null
}

const MEMBER_GRID_CAP = 60

/**
 * Everything the group detail page renders: members grid, avatar row,
 * top-karma contributors, accepted-request tags, and this-week joiners.
 * ponytail: loads all active member ids to rank contributors in app code —
 * fine to a few thousand members; push karma ranking into SQL if groups grow huge.
 */
export async function getGroupPageData(
  id: string,
  userId: string | null,
): Promise<GroupPageData | null> {
  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, name: true, type: true, visibility: true, isPermanent: true },
  })
  if (!group) return null

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)

  const [memberships, acceptedGroups] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId: id, status: "active" },
      select: { userId: true, role: true, joinedAt: true },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.groupRequest.groupBy({
      by: ["category"],
      where: { groupId: id, status: "accepted" },
      _count: true,
      orderBy: { _count: { category: "desc" } },
      take: 4,
    }),
  ])

  const memberCount = memberships.length
  const isJoined = userId ? memberships.some((m) => m.userId === userId) : false
  const canSeeAll = isJoined || group.visibility === "public"

  const roleByUser = new Map(memberships.map((m) => [m.userId, m.role as string]))
  const displayIds = memberships.slice(0, MEMBER_GRID_CAP).map((m) => m.userId)
  const newMemberIds = memberships.filter((m) => m.joinedAt >= weekAgo).map((m) => m.userId)
  const newMemberCount = newMemberIds.length

  // Top contributors: highest karma among this group's members.
  const allIds = memberships.map((m) => m.userId)
  const karma = allIds.length
    ? await prisma.userKarma.findMany({
        where: { userId: { in: allIds } },
        orderBy: { karmaBalance: "desc" },
        take: 3,
        select: { userId: true, karmaBalance: true },
      })
    : []
  const contributorIds = karma.map((k) => k.userId)

  // One user fetch for every id we render (grid ∪ contributors ∪ new members).
  const wantedIds = [...new Set([...displayIds, ...contributorIds, ...newMemberIds.slice(0, 3)])]
  const users = wantedIds.length
    ? await prisma.user.findMany({
        where: { id: { in: wantedIds } },
        select: {
          id: true, displayName: true, legalName: true, username: true, isVerified: true,
          profile: { select: { photoUrl: true, batch: { select: { startYear: true, endYear: true } } } },
        },
      })
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))
  const nameOf = (uid: string) => {
    const u = userMap.get(uid)
    return u ? u.displayName || u.legalName || u.username || "Member" : "Member"
  }

  const members: GroupPageMember[] = displayIds.map((uid) => {
    const u = userMap.get(uid)
    return {
      id: uid,
      name: nameOf(uid),
      photoUrl: u?.profile?.photoUrl ?? null,
      yearsLabel: yearsLabel(u?.profile?.batch ?? null),
      role: roleByUser.get(uid) ?? "member",
      isVerified: u?.isVerified ?? false,
    }
  })

  const topContributors: GroupContributor[] = karma.map((k) => ({
    id: k.userId,
    name: nameOf(k.userId),
    photoUrl: userMap.get(k.userId)?.profile?.photoUrl ?? null,
    karma: Math.round(Number(k.karmaBalance)),
  }))

  return {
    id: group.id,
    name: group.name,
    icon: iconForType(group.type),
    category: group.type,
    privacy: group.visibility === "private" ? "private" : "public",
    isOfficial: group.isPermanent,
    memberCount,
    isJoined,
    canSeeAll,
    members,
    recentJoinNames: memberships.slice(0, 3).map((m) => nameOf(m.userId)),
    topContributors,
    acceptedTags: acceptedGroups.map((g) => `#${g.category}`),
    newMembers: newMemberIds.slice(0, 3).map((uid) => ({
      id: uid,
      name: nameOf(uid),
      photoUrl: userMap.get(uid)?.profile?.photoUrl ?? null,
    })),
    newMemberCount,
  }
}

// ── Admin console list ──

export interface AdminGroupRow {
  id: string
  name: string
  category: string
  privacy: "public" | "private"
  members: number
  admins: string[]
  postsThisWeek: number
  lastActivity: string
  created: string
  isPermanent: boolean
}

/**
 * Every group with member count, admin names, posts-this-week, and last
 * activity — for /admin/groups. Global (cross-school) like the rest of admin.
 */
export async function getAdminGroupRows(): Promise<AdminGroupRow[]> {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, type: true, visibility: true, createdAt: true, isPermanent: true,
      _count: { select: { members: { where: { status: "active" } } } },
    },
  })
  if (groups.length === 0) return []
  const ids = groups.map((g) => g.id)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)

  const [admins, postsWeek, lastPost] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId: { in: ids }, role: "admin", status: "active" },
      select: { groupId: true, user: { select: { displayName: true, legalName: true, username: true } } },
    }),
    prisma.post.groupBy({ by: ["groupId"], where: { groupId: { in: ids }, createdAt: { gte: weekAgo } }, _count: true }),
    prisma.post.groupBy({ by: ["groupId"], where: { groupId: { in: ids } }, _max: { createdAt: true } }),
  ])

  const adminMap = new Map<string, string[]>()
  for (const a of admins) {
    if (!a.groupId) continue
    const name = a.user.displayName || a.user.legalName || a.user.username || "—"
    const list = adminMap.get(a.groupId) ?? []
    if (list.length < 2) list.push(name)
    adminMap.set(a.groupId, list)
  }
  const postsMap = new Map(postsWeek.map((p) => [p.groupId, p._count]))
  const lastMap = new Map(lastPost.map((p) => [p.groupId, p._max.createdAt]))

  return groups.map((g): AdminGroupRow => {
    const last = lastMap.get(g.id) ?? null
    return {
      id: g.id,
      name: g.name,
      category: g.type,
      privacy: g.visibility === "private" ? "private" : "public",
      members: g._count.members,
      admins: adminMap.get(g.id) ?? [],
      postsThisWeek: postsMap.get(g.id) ?? 0,
      lastActivity: last ? relativeTime(last, now) : "no posts yet",
      created: g.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      isPermanent: g.isPermanent,
    }
  })
}

/** Group ids the user is an active member of (per-viewer overlay). */
export async function myGroupIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.groupMember.findMany({
    where: { userId, status: "active" },
    select: { groupId: true },
  })
  return new Set(rows.map((r) => r.groupId))
}

export async function listGroups(
  schoolId: string,
  userId: string | null,
): Promise<GroupListItem[]> {
  const shared = await listGroupsShared(schoolId)
  if (!userId) return shared
  const joined = await myGroupIds(userId)
  return shared.map((g) => (joined.has(g.id) ? { ...g, isJoined: true } : g))
}

export async function joinGroup(userId: string, groupId: string): Promise<void> {
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId } },
    update: { status: "active" },
    create: { groupId, userId, role: "member", status: "active" },
  })
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  await prisma.groupMember.deleteMany({ where: { groupId, userId } })
}

export interface GroupDetail {
  id: string
  slug: string
  name: string
  description: string
  members: number
  privacy: "public" | "private"
  category: string
  cover: string
  icon: string
  isJoined: boolean
  postsThisWeek: number
  memberList: {
    id: string
    name: string
    role: string
    image: string
  }[]
}

export async function getGroupById(
  id: string,
  userId: string | null,
): Promise<GroupDetail | null> {
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      _count: { select: { members: { where: { status: "active" } } } },
      members: {
        where: { status: "active" },
        take: 24,
        orderBy: { joinedAt: "asc" },
        include: {
          user: { select: { id: true, displayName: true, legalName: true } },
        },
      },
    },
  })
  if (!group) return null

  const memberList = group.members.map((m) => ({
    id: m.user.id,
    name: m.user.displayName ?? m.user.legalName,
    role: m.role,
    image: "",
  }))

  const isJoined = userId
    ? group.members.some((m) => m.userId === userId)
    : false

  return {
    id: group.id,
    slug: group.id,
    name: group.name,
    description: group.description ?? "",
    members: group._count.members,
    privacy: group.visibility === "private" ? "private" : "public",
    category: group.type,
    cover: group.bannerUrl ?? "",
    icon: iconForType(group.type),
    isJoined,
    postsThisWeek: 0,
    memberList,
  }
}
