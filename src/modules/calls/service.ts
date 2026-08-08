import { prisma } from "@/lib/prisma"
import { getCurrent } from "@/modules/membership/service"
import {
  evaluateQuota,
  tierHasCalling,
  quotaMessage,
  WINDOW_MINUTES,
  PLATFORM_MONTHLY_MINUTE_BUDGET,
  type UsageByWindow,
  type CallKind,
} from "@/config/calls"

export interface CallAuth {
  ok: boolean
  /** Present when ok. */
  roomName?: string
  maxCallMinutes?: number
  canPublish?: boolean
  /** True when this call is being paid for by a student's single-use pass. */
  passId?: string
  /** Present when !ok — user-facing reason. */
  message?: string
  /** Machine-readable reason so the client can branch (e.g. open the paywall). */
  code?: "pass_required" | "budget" | "not_participant" | "tier_excluded" | "quota"
}

const roomForDm = (conversationId: string) => `dm_${conversationId}`
export const roomForAma = (amaId: string) => `ama_${amaId}`

/** Sum a user's DM call minutes over the three rolling windows (AMA excluded). */
async function dmUsage(userId: string, now: Date): Promise<UsageByWindow> {
  const monthAgo = new Date(now.getTime() - WINDOW_MINUTES.month * 60_000)
  const rows = await prisma.callUsage.findMany({
    where: { userId, kind: "dm", createdAt: { gte: monthAgo } },
    select: { minutes: true, createdAt: true },
  })
  const dayAgo = now.getTime() - WINDOW_MINUTES.day * 60_000
  const weekAgo = now.getTime() - WINDOW_MINUTES.week * 60_000
  const usage: UsageByWindow = { day: 0, week: 0, month: 0 }
  for (const r of rows) {
    const t = r.createdAt.getTime()
    usage.month += r.minutes
    if (t >= weekAgo) usage.week += r.minutes
    if (t >= dayAgo) usage.day += r.minutes
  }
  return usage
}

/** Newest active, unexpired student pass, or null. */
async function activePass(userId: string, now: Date) {
  return prisma.callPass.findFirst({
    where: { userId, status: "active", expiresAt: { gt: now } },
    orderBy: { purchasedAt: "desc" },
  })
}

/** Global kill-switch: platform-wide WebRTC minutes this rolling month vs budget. */
export async function platformBudgetExceeded(now: Date = new Date()): Promise<boolean> {
  const monthAgo = new Date(now.getTime() - WINDOW_MINUTES.month * 60_000)
  const agg = await prisma.callUsage.aggregate({
    _sum: { minutes: true },
    where: { createdAt: { gte: monthAgo } },
  })
  return (agg._sum.minutes ?? 0) >= PLATFORM_MONTHLY_MINUTE_BUDGET
}

/** Is the user one of the two participants of this conversation? */
async function isParticipant(userId: string, conversationId: string): Promise<boolean> {
  const row = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { userId: true },
  })
  return Boolean(row)
}

/**
 * Authorize a 1:1 DM huddle. Server-authoritative: resolves the real membership
 * tier, verifies conversation membership, enforces the global budget, then the
 * per-tier quota or (for students) a paid pass. Never trusts the client.
 */
export async function authorizeDmCall(userId: string, conversationId: string): Promise<CallAuth> {
  if (!(await isParticipant(userId, conversationId))) {
    return { ok: false, code: "not_participant", message: "You're not part of this conversation." }
  }
  if (await platformBudgetExceeded()) {
    return { ok: false, code: "budget", message: "Calling is temporarily paused for this month. Please try later." }
  }

  const now = new Date()
  const { planCode } = await getCurrent(userId)

  if (tierHasCalling(planCode)) {
    const decision = evaluateQuota(planCode, await dmUsage(userId, now))
    if (!decision.allowed) return { ok: false, code: "quota", message: quotaMessage(decision) }
    return {
      ok: true,
      roomName: roomForDm(conversationId),
      maxCallMinutes: decision.maxCallMinutes,
      canPublish: true,
    }
  }

  // Student / inactive → require a paid pass.
  const pass = await activePass(userId, now)
  if (!pass) {
    const decision = evaluateQuota(planCode, { day: 0, week: 0, month: 0 })
    return {
      ok: false,
      code: decision.reason === "pass_required" ? "pass_required" : "tier_excluded",
      message: quotaMessage(decision),
    }
  }
  return {
    ok: true,
    roomName: roomForDm(conversationId),
    maxCallMinutes: pass.minutes,
    canPublish: true,
    passId: pass.id,
  }
}

/**
 * Authorize joining an AMA. Free for every signed-in member (incl. students) —
 * audience only subscribes; the host and co-host publish. AMA minutes count
 * toward the platform budget but NOT anyone's personal quota.
 */
export async function authorizeAmaCall(userId: string, amaSessionId: string): Promise<CallAuth> {
  const ama = await prisma.amaSession.findUnique({ where: { id: amaSessionId } })
  if (!ama || ama.status === "ended") {
    return { ok: false, message: "This AMA has ended or doesn't exist." }
  }
  if (await platformBudgetExceeded()) {
    return { ok: false, code: "budget", message: "Calling is temporarily paused for this month. Please try later." }
  }
  const canPublish = userId === ama.hostId || userId === ama.coHostId
  return {
    ok: true,
    roomName: roomForAma(amaSessionId),
    // Whole-AMA cap; individual audience members aren't metered against quota.
    maxCallMinutes: 180,
    canPublish,
  }
}

/** Ensure a CallSession row exists for a room (idempotent on room_name). */
export async function ensureCallSession(opts: {
  roomName: string
  kind: CallKind
  startedById: string
  conversationId?: string
  amaSessionId?: string
  passId?: string
}): Promise<void> {
  const existing = await prisma.callSession.findUnique({ where: { roomName: opts.roomName } })
  if (existing) return
  await prisma.callSession.create({
    data: {
      roomName: opts.roomName,
      kind: opts.kind,
      startedById: opts.startedById,
      conversationId: opts.conversationId ?? null,
      amaSessionId: opts.amaSessionId ?? null,
      status: "live",
    },
  })
  // Bind the student pass to this room so the webhook consumes the right one.
  if (opts.passId) {
    await prisma.callPass.update({
      where: { id: opts.passId },
      data: { callSessionId: (await prisma.callSession.findUnique({ where: { roomName: opts.roomName }, select: { id: true } }))!.id },
    })
  }
}

/**
 * Record one participant's finished stint (called by the LiveKit webhook).
 * Idempotent-ish: a duplicate participant_left for the same room+user within a
 * minute is ignored. Consumes a student's pass when their DM stint ends.
 */
export async function recordParticipantLeft(opts: {
  roomName: string
  userId: string
  minutes: number
}): Promise<void> {
  const minutes = Math.max(0, Math.round(opts.minutes))
  const session = await prisma.callSession.findUnique({ where: { roomName: opts.roomName } })
  const kind = (session?.kind as CallKind) ?? "dm"

  // Dedup: skip if we already logged this user for this session very recently.
  if (session) {
    const recent = await prisma.callUsage.findFirst({
      where: { userId: opts.userId, callSessionId: session.id },
    })
    if (recent) return
  }

  await prisma.callUsage.create({
    data: { userId: opts.userId, callSessionId: session?.id ?? null, kind, minutes },
  })

  // Consume the student's pass bound to this session (one call = one pass).
  if (session) {
    await prisma.callPass.updateMany({
      where: { userId: opts.userId, callSessionId: session.id, status: "active" },
      data: { status: "consumed", consumedAt: new Date() },
    })
  }
}

/** Mark a room finished. */
export async function endCallSession(roomName: string): Promise<void> {
  await prisma.callSession.updateMany({
    where: { roomName, status: "live" },
    data: { status: "ended", endedAt: new Date() },
  })
}
