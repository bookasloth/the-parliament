import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/modules/auth/session"
import { sendNotification } from "@/modules/notifications/service"
import { endorserScore, summarizeEndorsementRows, type EndorsementSummary } from "./endorsements-logic"

export { endorserScore, summarizeEndorsementRows, type EndorsementSummary } from "./endorsements-logic"

const MAX_ASKS_PER_VERIFICATION = 10
const EXPIRY_DAYS = 30

export interface SuggestedEndorser {
  userId: string
  name: string
  username: string | null
  photoUrl: string | null
  batchLabel: string | null
  houseName: string | null
  reason: string // why suggested (same batch / same house / studied in the same years)
  alreadyAsked: boolean
  endorsementStatus: string | null // pending | endorsed | declined if already asked
}

/**
 * Candidate's peers: verified alumni who share the candidate's batch or house,
 * or whose batch year-range overlaps the candidate's (studied in the same period).
 * Ranked: batch+house > batch > house > year-overlap.
 */
export async function suggestEndorsers(
  verificationId: string,
  limit = 20,
): Promise<SuggestedEndorser[]> {
  const v = await prisma.alumniVerification.findUnique({
    where: { id: verificationId },
    select: { userId: true },
  })
  if (!v) throw new ForbiddenError("Verification not found")

  const candidate = await prisma.profile.findUnique({
    where: { userId: v.userId },
    select: {
      batchId: true,
      houseId: true,
      batch: { select: { startYear: true, endYear: true } },
    },
  })

  const batchId = candidate?.batchId ?? null
  const houseId = candidate?.houseId ?? null
  const startYear = candidate?.batch?.startYear ?? null
  const endYear = candidate?.batch?.endYear ?? null

  // No batch/house/year info at all → nothing to suggest from.
  if (!batchId && !houseId && startYear == null) return []

  // Batches whose year-range overlaps the candidate's: start <= candEnd && end >= candStart.
  let overlapBatchIds: string[] = []
  if (startYear != null && endYear != null) {
    const overlapping = await prisma.batch.findMany({
      where: { startYear: { lte: endYear }, endYear: { gte: startYear } },
      select: { id: true },
    })
    overlapBatchIds = overlapping.map((b) => b.id)
  }

  const orClauses = [
    ...(batchId ? [{ batchId }] : []),
    ...(houseId ? [{ houseId }] : []),
    ...(overlapBatchIds.length ? [{ batchId: { in: overlapBatchIds } }] : []),
  ]
  if (orClauses.length === 0) return []

  const candidates = await prisma.profile.findMany({
    where: {
      userId: { not: v.userId },
      user: { isVerified: true, deletedAt: null },
      OR: orClauses,
    },
    take: 60, // over-fetch, rank + slice below
    select: {
      userId: true,
      photoUrl: true,
      batchId: true,
      houseId: true,
      batch: { select: { label: true } },
      house: { select: { name: true } },
      user: { select: { legalName: true, displayName: true, username: true } },
    },
  })

  // Who's already been asked for this verification.
  const existing = await prisma.endorsement.findMany({
    where: { verificationId },
    select: { endorserId: true, status: true },
  })
  const askedMap = new Map(existing.map((e) => [e.endorserId, e.status]))

  const ranked = candidates
    .map((c) => {
      const sameBatch = batchId != null && c.batchId === batchId
      const sameHouse = houseId != null && c.houseId === houseId
      const { score, reason } = endorserScore(sameBatch, sameHouse)
      return {
        userId: c.userId,
        name: c.user.displayName || c.user.legalName,
        username: c.user.username,
        photoUrl: c.photoUrl,
        batchLabel: c.batch?.label ?? null,
        houseName: c.house?.name ?? null,
        reason,
        alreadyAsked: askedMap.has(c.userId),
        endorsementStatus: askedMap.get(c.userId) ?? null,
        _score: score,
      }
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ _score, ...rest }) => rest)

  return ranked
}

/** Admin asks one peer to endorse. Idempotent per (verification, endorser). */
export async function requestEndorsement(opts: {
  verificationId: string
  endorserId: string
  adminId: string
}): Promise<{ ok: true; alreadyAsked?: boolean }> {
  const v = await prisma.alumniVerification.findUnique({
    where: { id: opts.verificationId },
    select: { id: true, userId: true, status: true },
  })
  if (!v) throw new ForbiddenError("Verification not found")
  if (v.status !== "pending") throw new ForbiddenError("Verification already reviewed")
  if (opts.endorserId === v.userId) throw new ForbiddenError("Cannot ask the candidate to endorse themselves")

  const existing = await prisma.endorsement.findUnique({
    where: { verificationId_endorserId: { verificationId: opts.verificationId, endorserId: opts.endorserId } },
    select: { id: true },
  })
  if (existing) return { ok: true, alreadyAsked: true }

  const count = await prisma.endorsement.count({ where: { verificationId: opts.verificationId } })
  if (count >= MAX_ASKS_PER_VERIFICATION) {
    throw new ForbiddenError(`Limit reached — at most ${MAX_ASKS_PER_VERIFICATION} endorsers per request`)
  }

  const [endorser, candidate] = await Promise.all([
    prisma.user.findUnique({ where: { id: opts.endorserId }, select: { id: true, email: true, legalName: true, displayName: true } }),
    prisma.user.findUnique({ where: { id: v.userId }, select: { legalName: true, displayName: true } }),
  ])
  if (!endorser) throw new ForbiddenError("Endorser not found")

  const token = crypto.randomBytes(24).toString("base64url")
  await prisma.endorsement.create({
    data: {
      verificationId: opts.verificationId,
      candidateId: v.userId,
      endorserId: opts.endorserId,
      requestedBy: opts.adminId,
      token,
      expiresAt: new Date(Date.now() + EXPIRY_DAYS * 86400_000),
    },
  })

  const baseUrl = process.env.AUTH_URL || "https://nnawca.org"
  await sendNotification({
    userId: opts.endorserId,
    kind: "endorsement_request",
    title: "Can you vouch for a fellow Navodian?",
    body: `${candidate?.displayName || candidate?.legalName || "An alumnus"} is verifying their JNV Nagpur alumni status.`,
    entityType: "endorsement",
    entityId: opts.verificationId,
    email: {
      endorserName: endorser.displayName || endorser.legalName,
      candidateName: candidate?.displayName || candidate?.legalName || "a fellow alumnus",
      endorseUrl: `${baseUrl}/endorse/${token}`,
    },
  })

  return { ok: true }
}

/**
 * Endorser responds. Must be the asked user (session match enforced by caller).
 * `decision`: "endorsed" | "declined".
 */
export async function recordEndorsement(opts: {
  token: string
  responderId: string
  decision: "endorsed" | "declined"
  note?: string
}): Promise<{ ok: true }> {
  const e = await prisma.endorsement.findUnique({ where: { token: opts.token } })
  if (!e) throw new ForbiddenError("Endorsement request not found")
  if (e.endorserId !== opts.responderId) throw new ForbiddenError("This endorsement request isn't addressed to you")
  if (e.status !== "pending") throw new ForbiddenError("You've already responded to this request")
  if (e.expiresAt.getTime() < Date.now()) {
    await prisma.endorsement.update({ where: { id: e.id }, data: { status: "expired" } })
    throw new ForbiddenError("This endorsement request has expired")
  }

  await prisma.endorsement.update({
    where: { id: e.id },
    data: { status: opts.decision, respondedAt: new Date(), note: opts.note?.trim() || null },
  })

  // Tell the admin who asked (in-app only, no email).
  if (opts.decision === "endorsed") {
    const responder = await prisma.user.findUnique({
      where: { id: opts.responderId },
      select: { legalName: true, displayName: true },
    })
    await sendNotification({
      userId: e.requestedBy,
      kind: "endorsement_received",
      title: "New endorsement received",
      body: `${responder?.displayName || responder?.legalName || "A peer"} vouched for a verification candidate.`,
      entityType: "endorsement",
      entityId: e.verificationId,
      sendEmail: false,
    })
  }

  return { ok: true }
}

/** Counts per verification, for the admin queue. */
export async function endorsementSummaries(
  verificationIds: string[],
): Promise<Map<string, EndorsementSummary>> {
  if (verificationIds.length === 0) return new Map()
  const rows = await prisma.endorsement.groupBy({
    by: ["verificationId", "status"],
    where: { verificationId: { in: verificationIds } },
    _count: { _all: true },
  })
  return summarizeEndorsementRows(
    verificationIds,
    rows.map((r) => ({ verificationId: r.verificationId, status: r.status, count: r._count._all })),
  )
}

/** Candidate context for the endorse landing page. */
export async function getEndorsementByToken(token: string) {
  const e = await prisma.endorsement.findUnique({ where: { token } })
  if (!e) return null
  const candidateProfile = await prisma.profile.findUnique({
    where: { userId: e.candidateId },
    select: {
      photoUrl: true,
      batch: { select: { label: true } },
      house: { select: { name: true } },
      user: { select: { legalName: true, displayName: true, username: true } },
    },
  })
  return { endorsement: e, candidate: candidateProfile }
}
