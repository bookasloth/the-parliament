import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import { sendNotification } from "@/modules/notifications/service"
import { audit } from "@/lib/audit"

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
    body: "Welcome to The Parliament. You're now a Verified Alumni.",
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
