import { prisma } from "@/lib/prisma"
import type { SponsorTier } from "@/config/sponsor"

export interface WallEntry {
  id: string
  tier: SponsorTier
  kind: "individual" | "company"
  name: string
  websiteUrl: string | null
  logoUrl: string | null
  message: string | null
}

/**
 * Approved, paid, opt-in contributions for the public /development wall.
 * Defensive: returns empty groups if the table doesn't exist yet (pre-migration)
 * so the page falls back to its curated baseline instead of 500-ing.
 */
export async function getWallContributions(): Promise<{ companies: WallEntry[]; people: WallEntry[] }> {
  try {
    const rows = await prisma.contribution.findMany({
      where: { status: "paid", approved: true, showOnWall: true, isAnonymous: false },
      orderBy: [{ amountPaise: "desc" }, { paidAt: "desc" }],
      take: 60,
      select: { id: true, tier: true, kind: true, displayName: true, websiteUrl: true, logoUrl: true, message: true },
    })
    const entries: WallEntry[] = rows.map((r) => ({
      id: r.id,
      tier: (r.tier as SponsorTier) ?? "silver",
      kind: r.kind === "company" ? "company" : "individual",
      name: r.displayName ?? "Anonymous",
      websiteUrl: r.websiteUrl,
      logoUrl: r.logoUrl,
      message: r.message,
    }))
    return {
      companies: entries.filter((e) => e.kind === "company"),
      people: entries.filter((e) => e.kind === "individual"),
    }
  } catch {
    return { companies: [], people: [] }
  }
}

/** Total paise collected (status=paid), 0 if the table isn't there yet. Safe for the public page. */
export async function getPaidTotalPaiseSafe(): Promise<number> {
  try {
    const agg = await prisma.contribution.aggregate({ _sum: { amountPaise: true }, where: { status: "paid" } })
    return agg._sum.amountPaise ?? 0
  } catch {
    return 0
  }
}

export interface Certificate {
  id: string
  name: string
  amountPaise: number
  tier: SponsorTier
  kind: "individual" | "company"
  paidAt: Date | null
}

/**
 * Public certificate data for a PAID contribution. Returns null for missing or
 * unpaid rows (so the certificate page 404s instead of leaking a pending gift).
 * The row id is an unguessable UUID — that's the access token for the link.
 */
export async function getCertificate(id: string): Promise<Certificate | null> {
  try {
    const c = await prisma.contribution.findFirst({
      where: { id, status: "paid" },
      select: { id: true, displayName: true, amountPaise: true, tier: true, kind: true, paidAt: true },
    })
    if (!c) return null
    return {
      id: c.id,
      name: c.displayName ?? "A generous supporter",
      amountPaise: c.amountPaise,
      tier: (c.tier as SponsorTier) ?? "silver",
      kind: c.kind === "company" ? "company" : "individual",
      paidAt: c.paidAt,
    }
  } catch {
    return null
  }
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function listContributionsAdmin(limit = 100) {
  return prisma.contribution.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

/** Total paise actually collected (status=paid). */
export async function getContributionStats() {
  const [paidAgg, paidCount, pendingWall] = await Promise.all([
    prisma.contribution.aggregate({ _sum: { amountPaise: true }, where: { status: "paid" } }),
    prisma.contribution.count({ where: { status: "paid" } }),
    prisma.contribution.count({ where: { status: "paid", showOnWall: true, approved: false } }),
  ])
  return {
    totalPaise: paidAgg._sum.amountPaise ?? 0,
    paidCount,
    pendingApproval: pendingWall,
  }
}

/** Approve/unapprove a contribution for the wall. */
export async function setContributionApproval(id: string, approved: boolean, adminId: string) {
  return prisma.contribution.update({
    where: { id },
    data: { approved, approvedAt: approved ? new Date() : null, approvedById: approved ? adminId : null },
  })
}
