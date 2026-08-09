import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import { notifyCommittee } from "@/modules/committees/service"
import { audit } from "@/lib/audit"

export type ReportableEntity = "post" | "comment" | "profile" | "business" | "message"

export interface ReportInput {
  reporterId: string
  entityType: ReportableEntity
  entityId: string
  reason: string
  details?: string
}

export async function fileReport(input: ReportInput) {
  const existed = await prisma.contentReport.findUnique({
    where: {
      reporterId_entityType_entityId: {
        reporterId: input.reporterId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    },
    select: { id: true },
  })
  const report = await prisma.contentReport.upsert({
    where: {
      reporterId_entityType_entityId: {
        reporterId: input.reporterId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    },
    create: {
      reporterId: input.reporterId,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason,
      details: input.details,
    },
    update: {
      reason: input.reason,
      details: input.details,
      status: "open",
    },
  })

  if (input.entityType === "post") {
    await prisma.post.update({
      where: { id: input.entityId },
      data: { reportPenalty: { increment: 1 } },
    })
    const { recomputeRankingScore } = await import("@/modules/feed/posts")
    await recomputeRankingScore(input.entityId)
  }

  await audit({
    actorId: input.reporterId,
    action: "report.create",
    entityType: input.entityType,
    entityId: input.entityId,
    payload: { reason: input.reason },
  })

  // Alert the Tech & Media committee on a genuinely new report (not a re-file).
  if (!existed) {
    const base = process.env.AUTH_URL || "https://nnawca.org"
    await notifyCommittee("tech_media", {
      title: `New ${input.entityType} report`,
      detail: `A ${input.entityType} was reported for "${input.reason}". Review it in the moderation queue.`,
      actionUrl: `${base}/admin/moderation`,
      actionLabel: "Open moderation",
    }).catch((e) => console.error("committee notify (report) failed", e))
  }

  return report
}

export async function listOpenReports(limit = 50) {
  return prisma.contentReport.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      reporter: {
        select: { id: true, username: true, legalName: true, displayName: true },
      },
    },
  })
}

export async function resolveReport(opts: {
  reportId: string
  reviewerId: string
  resolution: "dismissed" | "warned" | "hidden" | "removed"
  notes?: string
}) {
  const r = await prisma.contentReport.findUnique({ where: { id: opts.reportId } })
  if (!r) throw new ForbiddenError("Report not found")

  await prisma.contentReport.update({
    where: { id: opts.reportId },
    data: {
      status: opts.resolution,
      resolvedBy: opts.reviewerId,
      resolvedAt: new Date(),
      details: opts.notes ? `${r.details ?? ""}\n[admin]: ${opts.notes}` : r.details,
    },
  })

  if ((opts.resolution === "hidden" || opts.resolution === "removed") && r.entityType === "post") {
    await prisma.post.update({
      where: { id: r.entityId },
      data: { status: opts.resolution },
    })
  }

  await audit({
    actorId: opts.reviewerId,
    action: `report.${opts.resolution}`,
    entityType: r.entityType,
    entityId: r.entityId,
    payload: { reportId: r.id },
  })
}
