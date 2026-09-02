import { prisma } from "@/lib/prisma"

// Unified per-user support timeline (audit P1-14): merges the audit log,
// moderation actions, and membership events into one chronological view so
// support can answer "what happened to this account?" without hand-querying
// three tables. Read-only.

export interface TimelineEntry {
  at: string
  source: "audit" | "moderation" | "membership"
  summary: string
  detail?: string | null
}

export async function getUserTimeline(userId: string, limit = 100): Promise<TimelineEntry[]> {
  const [audits, mods, memberships] = await Promise.all([
    prisma.auditLog.findMany({
      where: { OR: [{ actorId: userId }, { entityType: "user", entityId: userId }] },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { action: true, actorId: true, entityType: true, entityId: true, createdAt: true, payload: true },
    }),
    prisma.moderationAction.findMany({
      where: { OR: [{ moderatorId: userId }, { targetType: "user", targetId: userId }] },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { action: true, moderatorId: true, targetType: true, targetId: true, reason: true, createdAt: true },
    }),
    prisma.membershipEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { type: true, prevPlan: true, newPlan: true, createdAt: true },
    }),
  ])

  const entries: TimelineEntry[] = []

  for (const a of audits) {
    const asActor = a.actorId === userId
    entries.push({
      at: a.createdAt.toISOString(),
      source: "audit",
      summary: asActor ? `Did: ${a.action}` : `${a.action} (on this account)`,
      detail: a.entityType ? `${a.entityType}${a.entityId ? ` ${a.entityId.slice(0, 8)}` : ""}` : null,
    })
  }
  for (const m of mods) {
    const asTarget = m.targetType === "user" && m.targetId === userId
    entries.push({
      at: m.createdAt.toISOString(),
      source: "moderation",
      summary: asTarget ? `Moderation: ${m.action}` : `Moderated a ${m.targetType} (${m.action})`,
      detail: m.reason ?? null,
    })
  }
  for (const e of memberships) {
    entries.push({
      at: e.createdAt.toISOString(),
      source: "membership",
      summary: `Membership: ${e.type}`,
      detail: e.prevPlan || e.newPlan ? `${e.prevPlan ?? "—"} → ${e.newPlan ?? "—"}` : null,
    })
  }

  entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
  return entries.slice(0, limit)
}
