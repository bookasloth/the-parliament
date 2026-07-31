import { prisma } from "@/lib/prisma"

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export function dmKeyFor(a: string, b: string): string {
  return [a, b].sort().join(":")
}

export async function canMessage(viewerId: string, otherId: string): Promise<boolean> {
  if (viewerId === otherId) return false
  const rel = await prisma.follow.findFirst({
    where: {
      OR: [
        { followerId: viewerId, followingId: otherId },
        { followerId: otherId, followingId: viewerId },
      ],
    },
    select: { followerId: true },
  })
  return !!rel
}

export async function findOrCreateConversation(viewerId: string, otherId: string): Promise<{ id: string }> {
  if (!(await canMessage(viewerId, otherId))) {
    throw new ForbiddenError("You can only message your connections")
  }
  const dmKey = dmKeyFor(viewerId, otherId)
  const existing = await prisma.conversation.findUnique({ where: { dmKey }, select: { id: true } })
  if (existing) return existing
  const conv = await prisma.conversation.create({
    data: {
      dmKey,
      participants: { create: [{ userId: viewerId }, { userId: otherId }] },
    },
    select: { id: true },
  })
  return conv
}
