import { prisma } from "@/lib/prisma"

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

export async function listGroups(
  schoolId: string,
  userId: string | null,
): Promise<GroupListItem[]> {
  const groups = await prisma.group.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: { where: { status: "active" } } } },
      members: userId
        ? { where: { userId, status: "active" }, select: { userId: true } }
        : false,
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
    isJoined: userId ? (g as { members?: unknown[] }).members?.length ? true : false : false,
    lastActivity: relative(g.createdAt),
    postsThisWeek: 0,
    isFeatured: false,
  }))
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
