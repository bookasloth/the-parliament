import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export interface LeaderRow {
  rank: number;
  userId: string;
  username: string | null;
  name: string;
  photoUrl: string | null;
  houseName: string | null;
  houseColor: string | null;
  batchLabel: string | null;
  score: number;
  badgeCount: number;
}

export interface LeaderboardData {
  rows: LeaderRow[];
  viewer: { rank: number; score: number } | null;
}

const EXCLUDE: Prisma.UserWhereInput = { deletedAt: null, status: "active", memberType: { notIn: ["bot", "system"] } };

function batchLabel(b: { startYear: number | null; endYear: number | null; label: string | null } | null): string | null {
  if (!b) return null;
  if (b.label) return b.label;
  if (b.startYear && b.endYear) return `${b.startYear}–${b.endYear}`;
  return b.startYear ? String(b.startYear) : null;
}

/** Lifetime achievement-score leaderboard (denormalized users.achievement_score). */
export async function getLeaderboard(viewerId?: string, take = 50): Promise<LeaderboardData> {
  const users = await prisma.user.findMany({
    where: { ...EXCLUDE, achievementScore: { gt: 0 } },
    orderBy: [{ achievementScore: "desc" }, { badgeCount: "desc" }, { createdAt: "asc" }],
    take,
    select: {
      id: true,
      username: true,
      displayName: true,
      legalName: true,
      achievementScore: true,
      badgeCount: true,
      profile: {
        select: {
          photoUrl: true,
          house: { select: { name: true, colorHex: true } },
          batch: { select: { startYear: true, endYear: true, label: true } },
        },
      },
    },
  });

  const rows: LeaderRow[] = users.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    username: u.username,
    name: u.displayName || u.legalName || "Alumnus",
    photoUrl: u.profile?.photoUrl ?? null,
    houseName: u.profile?.house?.name ?? null,
    houseColor: u.profile?.house?.colorHex ?? null,
    batchLabel: batchLabel(u.profile?.batch ?? null),
    score: u.achievementScore,
    badgeCount: u.badgeCount,
  }));

  let viewer: LeaderboardData["viewer"] = null;
  if (viewerId) {
    const inList = rows.find((r) => r.userId === viewerId);
    if (inList) {
      viewer = { rank: inList.rank, score: inList.score };
    } else {
      const me = await prisma.user.findUnique({
        where: { id: viewerId },
        select: { achievementScore: true },
      });
      if (me && me.achievementScore > 0) {
        // Rank = how many active users out-score you, + 1.
        const ahead = await prisma.user.count({
          where: { ...EXCLUDE, achievementScore: { gt: me.achievementScore } },
        });
        viewer = { rank: ahead + 1, score: me.achievementScore };
      }
    }
  }

  return { rows, viewer };
}
