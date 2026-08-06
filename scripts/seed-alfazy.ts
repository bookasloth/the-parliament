/**
 * Seed realistic Alfazy history from launch (2026-07-01) through YESTERDAY, using
 * the REAL existing users in the target DB, then freeze champions.
 *
 * Deterministic (hash-seeded per user+day) so re-runs are stable and idempotent
 * (unique [game,user,day] → skips existing rows). Leaves TODAY open so a logged-in
 * user can still play the live puzzle.
 *
 *   npx tsx scripts/seed-alfazy.ts
 *
 * Respects DATABASE_URL. Prints a summary; does not delete anything.
 * NOTE: DATABASE_URL may point at production — check before running.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { scorePlay, MAX_GUESSES } from "../src/modules/games/alfazy";
import { ALFAZY_LAUNCH, puzzleNumber } from "../src/modules/games/periods";
import { backfillChampions } from "../src/modules/games/champions";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DAY_MS = 86_400_000;

/** Deterministic 0..1 from a string (mulberry32 over a cheap hash). */
function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Guesses distribution: mostly 3-4, occasional 1-2, ~12% fail. */
function drawPlay(r: () => number): { solved: boolean; guesses: number } {
  const x = r();
  if (x < 0.05) return { solved: true, guesses: 1 };
  if (x < 0.2) return { solved: true, guesses: 2 };
  if (x < 0.5) return { solved: true, guesses: 3 };
  if (x < 0.78) return { solved: true, guesses: 4 };
  if (x < 0.88) return { solved: true, guesses: 5 };
  return { solved: false, guesses: MAX_GUESSES };
}

async function main() {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const games = await prisma.game.findMany({ where: { key: "alfazy" }, select: { id: true, schoolId: true } });
  if (!games.length) throw new Error("No Alfazy game row. Run prisma/seed-alfazy-words.sql first.");

  let created = 0;
  let skipped = 0;

  for (const game of games) {
    // Real players: active users of this school with a profile.
    const users = await prisma.user.findMany({
      where: { schoolId: game.schoolId, status: "active", profile: { isNot: null } },
      select: { id: true },
    });
    if (!users.length) {
      console.log(`school ${game.schoolId}: no eligible players, skipping`);
      continue;
    }

    for (let d = new Date(ALFAZY_LAUNCH); d < todayUtc; d = new Date(d.getTime() + DAY_MS)) {
      const puzzleDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const pno = puzzleNumber(d);

      for (const u of users) {
        const r = rng(`${u.id}:${pno}`);
        // participation: ~70% play any given day (varies by user+day)
        if (r() > 0.7) continue;

        const { solved, guesses } = drawPlay(r);
        const playedAt = new Date(puzzleDate.getTime() + Math.floor(r() * 20 * 3600_000)); // within the day

        try {
          await prisma.gameScore.create({
            data: {
              gameId: game.id,
              userId: u.id,
              puzzleDate,
              score: scorePlay(solved, guesses),
              levelReached: solved ? guesses : null,
              solved,
              karmaAwarded: 0,
              playedAt,
            },
          });
          created++;
        } catch (e: unknown) {
          if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
            skipped++; // already seeded — idempotent
          } else {
            throw e;
          }
        }
      }
    }
  }

  console.log(`Scores: ${created} created, ${skipped} already present.`);
  console.log("Freezing champions…");
  const frozen = await backfillChampions(now);
  console.log(`Champions frozen: ${frozen} rows.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
