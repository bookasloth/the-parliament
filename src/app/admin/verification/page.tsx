import { requireAdmin } from "@/modules/auth/session"
import { listPending } from "@/modules/verification/service"
import { endorsementSummaries } from "@/modules/verification/endorsements"
import { prisma } from "@/lib/prisma"
import { relativeTime } from "@/lib/relative-time"
import VerificationClient, { type VReq } from "./verification-client"

export default async function AdminVerificationPage() {
  await requireAdmin()

  const [pending, approved30d, rejected30d] = await Promise.all([
    listPending(100),
    prisma.alumniVerification.count({
      where: { status: "approved", reviewedAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
    }),
    prisma.alumniVerification.count({
      where: { status: "rejected", reviewedAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
    }),
  ])

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

  return <VerificationClient requests={requests} approved30d={approved30d} rejected30d={rejected30d} />
}
