/**
 * Recompute every user's achievement_score + badge_count from LIVE (dynamic)
 * rarity. Run once now to align existing scores with the holder-count rarity;
 * the daily /api/cron/badges keeps it fresh after.
 *
 *   npx tsx scripts/recompute-badge-scores.ts
 *
 * Respects DATABASE_URL — check it before running.
 */
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { recomputeAchievementScores } from "../src/modules/badges/cron";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const updated = await recomputeAchievementScores();
  console.log(`Recomputed achievement scores: ${updated} user rows updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
