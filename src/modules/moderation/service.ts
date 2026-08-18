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

// ── Moderation action log ──

export type ModerationTarget = ReportableEntity | "user"

export async function logModerationAction(a: {
  moderatorId: string
  targetType: ModerationTarget
  targetId: string
  action: string
  reason?: string
  expiresAt?: Date | null
  reportId?: string
}) {
  await prisma.moderationAction.create({
    data: {
      moderatorId: a.moderatorId,
      targetType: a.targetType,
      targetId: a.targetId,
      action: a.action,
      reason: a.reason,
      expiresAt: a.expiresAt ?? null,
      reportId: a.reportId,
    },
  })
}

// ── Clustered report queue ──
// Ten reports on one post collapse to a single cluster row keyed by
// (entityType, entityId). ponytail: JS grouping over the open set; move to a
// SQL GROUP BY if the open queue ever gets large.

export interface ReportCluster {
  entityType: string
  entityId: string
  reportCount: number
  reasons: string[]
  reporters: string[]
  firstAt: string
  lastAt: string
  assigneeId: string | null
}

export async function listReportClusters(limit = 200): Promise<ReportCluster[]> {
  const rows = await prisma.contentReport.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      reporter: { select: { legalName: true, displayName: true, username: true } },
    },
  })

  const byEntity = new Map<string, ReportCluster>()
  for (const r of rows) {
    const key = `${r.entityType}:${r.entityId}`
    const name = r.reporter?.legalName || r.reporter?.displayName || r.reporter?.username || "unknown"
    const existing = byEntity.get(key)
    if (!existing) {
      byEntity.set(key, {
        entityType: r.entityType,
        entityId: r.entityId,
        reportCount: 1,
        reasons: [r.reason],
        reporters: [name],
        firstAt: r.createdAt.toISOString(),
        lastAt: r.createdAt.toISOString(),
        assigneeId: r.assigneeId,
      })
    } else {
      existing.reportCount++
      if (!existing.reasons.includes(r.reason)) existing.reasons.push(r.reason)
      if (!existing.reporters.includes(name)) existing.reporters.push(name)
      existing.lastAt = r.createdAt.toISOString()
      existing.assigneeId = existing.assigneeId ?? r.assigneeId
    }
  }
  // Busiest clusters first.
  return [...byEntity.values()].sort((a, b) => b.reportCount - a.reportCount)
}

/** Claim (or release) every open report on an entity for a moderator. */
export async function assignCluster(
  entityType: string,
  entityId: string,
  moderatorId: string | null,
) {
  await prisma.contentReport.updateMany({
    where: { entityType, entityId, status: "open" },
    data: { assigneeId: moderatorId },
  })
}

/**
 * Resolve ALL open reports on one entity at once, apply the content consequence,
 * and log a moderation action. Replaces per-report resolution for the clustered
 * queue.
 */
export async function resolveCluster(opts: {
  entityType: ReportableEntity
  entityId: string
  reviewerId: string
  resolution: "dismissed" | "warned" | "hidden" | "removed"
  notes?: string
}) {
  const open = await prisma.contentReport.findMany({
    where: { entityType: opts.entityType, entityId: opts.entityId, status: "open" },
    select: { id: true },
  })
  if (open.length === 0) throw new ForbiddenError("No open reports on this entity")

  await prisma.contentReport.updateMany({
    where: { entityType: opts.entityType, entityId: opts.entityId, status: "open" },
    data: { status: opts.resolution, resolvedBy: opts.reviewerId, resolvedAt: new Date() },
  })

  if ((opts.resolution === "hidden" || opts.resolution === "removed") && opts.entityType === "post") {
    await prisma.post.update({ where: { id: opts.entityId }, data: { status: opts.resolution } })
  }

  await logModerationAction({
    moderatorId: opts.reviewerId,
    targetType: opts.entityType,
    targetId: opts.entityId,
    action: opts.resolution,
    reason: opts.notes,
    reportId: open[0]?.id,
  })

  await audit({
    actorId: opts.reviewerId,
    action: `report.${opts.resolution}`,
    entityType: opts.entityType,
    entityId: opts.entityId,
    payload: { reportCount: open.length, notes: opts.notes },
  })

  return { resolved: open.length }
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
