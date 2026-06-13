import { prisma } from "@/lib/prisma"
import { VOTING_MIN_ACTIVE_DAYS } from "@/config/membership"
import { audit } from "@/lib/audit"

export async function snapshotEligibility(pollId: string): Promise<number> {
  const cutoff = new Date(Date.now() - VOTING_MIN_ACTIVE_DAYS * 86400000)
  const eligible = await prisma.user.findMany({
    where: {
      isVerified: true,
      status: "active",
      createdAt: { lte: cutoff },
      deletedAt: null,
    },
    select: { id: true },
  })

  if (eligible.length === 0) return 0

  await prisma.$transaction([
    prisma.pollEligibility.deleteMany({ where: { pollId } }),
    prisma.pollEligibility.createMany({
      data: eligible.map((u) => ({ pollId, userId: u.id })),
      skipDuplicates: true,
    }),
  ])

  await audit({
    action: "voting.snapshot",
    entityType: "poll",
    entityId: pollId,
    payload: { eligible: eligible.length, minDays: VOTING_MIN_ACTIVE_DAYS },
  })

  return eligible.length
}

export async function isEligibleForPoll(pollId: string, userId: string): Promise<boolean> {
  const row = await prisma.pollEligibility.findUnique({
    where: { pollId_userId: { pollId, userId } },
  })
  return !!row
}

export async function eligibleCount(pollId: string): Promise<number> {
  return prisma.pollEligibility.count({ where: { pollId } })
}
