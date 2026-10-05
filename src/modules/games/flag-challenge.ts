import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/errors";
import { assertCanInteract } from "@/modules/feed/posts";
import { botAnnounce } from "@/modules/bot/service";
import { resolveGameSubmissionImage, publicUrlFor } from "@/lib/r2";
import { getDefaultSchoolId } from "@/lib/school";
import { isValidFlagCode, countryName } from "@/config/flag-challenge";
import { clampScore } from "@/modules/games/flag-scoring";

// Midnight UTC of the given instant, as a date-only Date (matches @db.Date).
function utcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ── Admin queue ──────────────────────────────────────────────────────────

/** Queue (or move) a flag for a given day. One flag per school per day. */
export async function queueFlag(schoolId: string, countryCode: string, scheduledFor: Date) {
  const code = countryCode.toLowerCase();
  const name = countryName(code);
  if (!isValidFlagCode(code) || !name) throw new ForbiddenError("Unknown flag");
  return prisma.flagChallenge.upsert({
    where: { schoolId_scheduledFor: { schoolId, scheduledFor: utcDay(scheduledFor) } },
    create: { schoolId, countryCode: code, countryName: name, scheduledFor: utcDay(scheduledFor) },
    update: { countryCode: code, countryName: name },
  });
}

/** Upcoming + recent challenges for the admin queue view. */
export async function listQueue(schoolId: string, take = 60) {
  return prisma.flagChallenge.findMany({
    where: { schoolId },
    orderBy: { scheduledFor: "desc" },
    take,
    select: {
      id: true,
      countryCode: true,
      countryName: true,
      scheduledFor: true,
      postId: true,
      submissionCount: true,
    },
  });
}

/** Remove a queued flag — only if it hasn't been posted yet. */
export async function removeQueued(id: string) {
  const c = await prisma.flagChallenge.findUnique({ where: { id }, select: { postId: true } });
  if (!c) throw new ForbiddenError("Not found");
  if (c.postId) throw new ForbiddenError("Already posted — can't remove");
  await prisma.flagChallenge.delete({ where: { id } });
}

// ── Cron: post the day's challenge ───────────────────────────────────────

/**
 * Post every due, not-yet-posted challenge (scheduledFor <= today) as a flag
 * feed post from the official account, and link the post back to the challenge.
 * Idempotent: a challenge with a postId is skipped, so re-running the cron is
 * safe. Returns the number posted.
 */
export async function postDueChallenges(now = new Date()): Promise<number> {
  const schoolId = await getDefaultSchoolId();
  if (!schoolId) return 0;
  const due = await prisma.flagChallenge.findMany({
    where: { schoolId, postId: null, scheduledFor: { lte: utcDay(now) } },
    orderBy: { scheduledFor: "asc" },
  });
  let posted = 0;
  for (const c of due) {
    const post = await botAnnounce({
      format: "flag",
      body: `🏴 Flag Challenge — draw the flag of ${c.countryName} from memory, then reveal to see your match!`,
    });
    if (!post) break; // bot/school not set up — leave the rest queued for next run
    await prisma.flagChallenge.update({ where: { id: c.id }, data: { postId: post.id } });
    posted++;
  }
  return posted;
}

// ── Member: submit a drawing ─────────────────────────────────────────────

/**
 * Record a player's drawing + score for a challenge. Gated by the same
 * visibility/block rules as any post interaction. The image key must be under
 * the caller's own upload prefix (validated + size-checked). One row per user
 * per challenge; resubmitting overwrites the drawing/score without double-
 * counting. Score is clamped 0–100 server-side (never trust the client number).
 */
export async function submitFlag(input: {
  userId: string;
  challengeId: string;
  imageKey: string;
  score: number;
}) {
  const challenge = await prisma.flagChallenge.findUnique({
    where: { id: input.challengeId },
    select: { id: true, postId: true },
  });
  if (!challenge || !challenge.postId) throw new ForbiddenError("Challenge not found");

  // Visibility/block/suspension gate (same as polls, comments, reactions).
  await assertCanInteract(input.userId, challenge.postId);

  // Ownership + size validation; throws on a foreign or oversized key.
  await resolveGameSubmissionImage(input.userId, input.imageKey);

  const score = clampScore(input.score);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.flagSubmission.findUnique({
      where: { userId_challengeId: { userId: input.userId, challengeId: input.challengeId } },
      select: { userId: true },
    });
    await tx.flagSubmission.upsert({
      where: { userId_challengeId: { userId: input.userId, challengeId: input.challengeId } },
      create: { userId: input.userId, challengeId: input.challengeId, imageKey: input.imageKey, score },
      update: { imageKey: input.imageKey, score, submittedAt: new Date() },
    });
    if (!existing) {
      await tx.flagChallenge.update({
        where: { id: input.challengeId },
        data: { submissionCount: { increment: 1 } },
      });
    }
  });

  return { score };
}

/** The viewer's own submission for a challenge (for feed hydration). */
export async function getMySubmission(userId: string, challengeId: string) {
  const s = await prisma.flagSubmission.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
    select: { imageKey: true, score: true },
  });
  return s ? { score: s.score, imageUrl: publicUrlFor(s.imageKey) } : null;
}

/** Gallery of submitted drawings for a challenge, best score first. */
export async function listSubmissions(challengeId: string, take = 60) {
  const rows = await prisma.flagSubmission.findMany({
    where: { challengeId },
    orderBy: [{ score: "desc" }, { submittedAt: "asc" }],
    take,
    select: {
      score: true,
      imageKey: true,
      user: {
        select: {
          username: true,
          displayName: true,
          legalName: true,
          profile: { select: { photoUrl: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    score: r.score,
    imageUrl: publicUrlFor(r.imageKey),
    username: r.user.username,
    name: r.user.displayName || r.user.legalName || "Alum",
    avatarUrl: r.user.profile?.photoUrl ?? null,
  }));
}
