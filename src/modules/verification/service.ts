import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import { sendNotification } from "@/modules/notifications/service"
import { notifyCommittee } from "@/modules/committees/service"
import { audit } from "@/lib/audit"
import { scoreCandidate } from "./ranking"

export type VerificationMethod = "id_upload" | "alumni_vouch" | "institute_email"

export interface SubmitInput {
  userId: string
  method: VerificationMethod
  evidenceKey?: string
  instituteEmail?: string
}

export async function submitVerification(input: SubmitInput) {
  const submission = await prisma.alumniVerification.create({
    data: {
      userId: input.userId,
      method: input.method,
      evidenceUrl: input.evidenceKey,
      instituteEmail: input.instituteEmail,
      status: "pending",
    },
  })

  await prisma.user.update({
    where: { id: input.userId },
    data: { verificationStatus: "pending" },
  })

  await audit({
    actorId: input.userId,
    action: "verification.submit",
    entityType: "alumni_verification",
    entityId: submission.id,
    payload: { method: input.method },
  })

  // Alert the Alumni-Student Relation committee to review the new submission.
  const applicant = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { legalName: true, email: true },
  })
  const base = process.env.AUTH_URL || "https://nnawca.org"
  await notifyCommittee("alumni_student", {
    title: "New alumni verification to review",
    detail: `${applicant?.legalName || "A member"} (${applicant?.email || "—"}) submitted a ${input.method.replace("_", " ")} verification. Please review it in the admin queue.`,
    actionUrl: `${base}/admin/verification`,
    actionLabel: "Review verification",
  }).catch((e) => console.error("committee notify (verification) failed", e))

  return submission
}

export async function listPending(limit = 50) {
  return prisma.alumniVerification.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          legalName: true,
          displayName: true,
          username: true,
          schoolId: true,
          memberType: true,
          createdAt: true,
        },
      },
    },
  })
}

export interface UnverifiedCandidate {
  userId: string
  name: string
  email: string
  username: string | null
  memberType: string
  profileCompletion: number
  hasJnvData: boolean
  followers: number
  endorsedCount: number
  createdAt: Date
  score: number
}

/**
 * Unverified members who are NOT already in the pending review queue — the
 * people who never submitted evidence. Ranked by signal (peer vouches, then
 * profile completeness, then JNV data on file) so admins act on the strongest
 * candidates first. An admin can then Start review (creates the queue row that
 * unlocks endorsement requests) or Verify now.
 */
export async function listUnverifiedCandidates(limit = 50): Promise<UnverifiedCandidate[]> {
  const inQueue = await prisma.alumniVerification.findMany({
    where: { status: "pending" },
    select: { userId: true },
  })
  const queueIds = inQueue.map((r) => r.userId)

  const users = await prisma.user.findMany({
    where: {
      isVerified: false,
      deletedAt: null,
      ...(queueIds.length ? { id: { notIn: queueIds } } : {}),
    },
    select: {
      id: true, email: true, legalName: true, displayName: true, username: true,
      memberType: true, schoolId: true, currentClass: true, yearsStudied: true,
      profileCompletion: true, createdAt: true,
    },
    take: 500, // cap the scan; ranking then trims to `limit`
  })
  if (users.length === 0) return []

  const ids = users.map((u) => u.id)
  const [followerRows, endorsedRows] = await Promise.all([
    prisma.follow.groupBy({ by: ["followingId"], where: { followingId: { in: ids } }, _count: true }),
    prisma.endorsement.groupBy({ by: ["candidateId"], where: { candidateId: { in: ids }, status: "endorsed" }, _count: true }),
  ])
  const followerMap = new Map(followerRows.map((r) => [r.followingId, r._count]))
  const endorsedMap = new Map(endorsedRows.map((r) => [r.candidateId, r._count]))

  return users
    .map((u): UnverifiedCandidate => {
      const hasJnvData = u.schoolId != null && (u.currentClass != null || u.yearsStudied != null)
      const endorsedCount = endorsedMap.get(u.id) ?? 0
      return {
        userId: u.id,
        name: u.legalName || u.displayName || u.username || u.email,
        email: u.email,
        username: u.username,
        memberType: u.memberType,
        profileCompletion: u.profileCompletion,
        hasJnvData,
        followers: followerMap.get(u.id) ?? 0,
        endorsedCount,
        createdAt: u.createdAt,
        score: scoreCandidate({ endorsedCount, profileCompletion: u.profileCompletion, hasJnvData }),
      }
    })
    .sort((a, b) => b.score - a.score || b.followers - a.followers)
    .slice(0, limit)
}

/**
 * Move an unverified member into the review queue by creating a pending
 * admin-initiated verification row — this is what enables endorsement requests
 * (vouching) and the normal approve/reject flow. Idempotent.
 */
export async function startAdminReview(opts: { userId: string; adminId: string }) {
  const user = await prisma.user.findUnique({ where: { id: opts.userId }, select: { id: true, isVerified: true } })
  if (!user) throw new ForbiddenError("User not found")
  if (user.isVerified) throw new ForbiddenError("Already verified")

  const existing = await prisma.alumniVerification.findFirst({
    where: { userId: opts.userId, status: "pending" },
    select: { id: true },
  })
  if (existing) return { id: existing.id }

  const v = await prisma.alumniVerification.create({
    data: { userId: opts.userId, method: "admin_review", status: "pending" },
  })
  await prisma.user.update({ where: { id: opts.userId }, data: { verificationStatus: "pending" } })
  await audit({
    actorId: opts.adminId,
    action: "verification.start_review",
    entityType: "alumni_verification",
    entityId: v.id,
    payload: { userId: opts.userId },
  })
  return { id: v.id }
}

/**
 * Verify an unverified member directly (no submitted evidence) — for cases the
 * admin can personally vouch for. Creates an approved row + flips the user to
 * verified, mirroring approveVerification's side effects.
 */
export async function verifyUserDirectly(opts: { userId: string; adminId: string; loginUrl: string }) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { id: true, email: true, legalName: true, isVerified: true },
  })
  if (!user) throw new ForbiddenError("User not found")
  if (user.isVerified) throw new ForbiddenError("Already verified")

  const v = await prisma.alumniVerification.create({
    data: { userId: opts.userId, method: "admin_manual", status: "approved", reviewedBy: opts.adminId, reviewedAt: new Date() },
  })
  await prisma.user.update({
    where: { id: opts.userId },
    data: { isVerified: true, verifiedAt: new Date(), verificationStatus: "approved" },
  })

  await sendNotification({
    userId: opts.userId,
    kind: "verification_approved",
    title: "Verification approved",
    body: "Welcome to NNAWCA. You're now a Verified Alumni.",
    entityType: "alumni_verification",
    entityId: v.id,
    email: { legalName: user.legalName, loginUrl: opts.loginUrl },
  })
  await audit({
    actorId: opts.adminId,
    action: "verification.approve_direct",
    entityType: "alumni_verification",
    entityId: v.id,
    payload: { userId: opts.userId },
  })
  return { id: v.id }
}

export async function approveVerification(opts: {
  verificationId: string
  reviewerId: string
  loginUrl: string
}) {
  const v = await prisma.alumniVerification.findUnique({
    where: { id: opts.verificationId },
    include: { user: { select: { id: true, email: true, legalName: true } } },
  })
  if (!v) throw new ForbiddenError("Verification not found")
  if (v.status !== "pending") throw new ForbiddenError("Already reviewed")

  await prisma.$transaction([
    prisma.alumniVerification.update({
      where: { id: v.id },
      data: { status: "approved", reviewedBy: opts.reviewerId, reviewedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: v.userId },
      data: { isVerified: true, verifiedAt: new Date(), verificationStatus: "approved" },
    }),
  ])

  await sendNotification({
    userId: v.userId,
    kind: "verification_approved",
    title: "Verification approved",
    body: "Welcome to NNAWCA. You're now a Verified Alumni.",
    entityType: "alumni_verification",
    entityId: v.id,
    email: { legalName: v.user.legalName, loginUrl: opts.loginUrl },
  })

  await audit({
    actorId: opts.reviewerId,
    action: "verification.approve",
    entityType: "alumni_verification",
    entityId: v.id,
    payload: { userId: v.userId },
  })
}

export async function rejectVerification(opts: {
  verificationId: string
  reviewerId: string
  reason: string
}) {
  const v = await prisma.alumniVerification.findUnique({
    where: { id: opts.verificationId },
    include: { user: { select: { id: true, email: true, legalName: true } } },
  })
  if (!v) throw new ForbiddenError("Verification not found")
  if (v.status !== "pending") throw new ForbiddenError("Already reviewed")

  await prisma.$transaction([
    prisma.alumniVerification.update({
      where: { id: v.id },
      data: {
        status: "rejected",
        reviewedBy: opts.reviewerId,
        reviewedAt: new Date(),
        rejectReason: opts.reason,
      },
    }),
    prisma.user.update({
      where: { id: v.userId },
      data: { verificationStatus: "rejected" },
    }),
  ])

  await sendNotification({
    userId: v.userId,
    kind: "verification_rejected",
    title: "Verification needs attention",
    body: opts.reason,
    entityType: "alumni_verification",
    entityId: v.id,
    email: { legalName: v.user.legalName, reason: opts.reason },
  })

  await audit({
    actorId: opts.reviewerId,
    action: "verification.reject",
    entityType: "alumni_verification",
    entityId: v.id,
    payload: { userId: v.userId, reason: opts.reason },
  })
}
