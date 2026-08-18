import { requireAdmin } from "@/modules/auth/session"
import { listPending, listUnverifiedCandidates } from "@/modules/verification/service"
import { endorsementSummaries } from "@/modules/verification/endorsements"
import { prisma } from "@/lib/prisma"
import { relativeTime } from "@/lib/relative-time"
import VerificationClient, { type VReq, type VCandidate } from "./verification-client"

export default async function AdminVerificationPage() {
  await requireAdmin()

  const [pending, approved30d, rejected30d, unverified] = await Promise.all([
    listPending(100),
    prisma.alumniVerification.count({
      where: { status: "approved", reviewedAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
    }),
    prisma.alumniVerification.count({
      where: { status: "rejected", reviewedAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
    }),
    listUnverifiedCandidates(50),
  ])

  const candidates: VCandidate[] = unverified.map((c) => ({
    userId: c.userId,
    name: c.name,
    email: c.email,
    username: c.username,
    memberType: c.memberType,
    profileCompletion: c.profileCompletion,
    hasJnvData: c.hasJnvData,
    followers: c.followers,
    endorsedCount: c.endorsedCount,
    joined: relativeTime(c.createdAt),
  }))

  const summaries = await endorsementSummaries(pending.map((v) => v.id))

  const requests: VReq[] = pending.map((v) => ({
    id: v.id,
    name: v.user.legalName || v.user.displayName || v.user.username || v.user.email,
    email: v.user.email,
    username: v.user.username,
    memberType: v.user.memberType,
    method: v.method,
    instituteEmail: v.instituteEmail,
    evidenceUrl: v.evidenceUrl,
    submitted: relativeTime(v.createdAt),
    endorsements: summaries.get(v.id) ?? { asked: 0, endorsed: 0, declined: 0 },
  }))

  return <VerificationClient requests={requests} candidates={candidates} approved30d={approved30d} rejected30d={rejected30d} />
}
