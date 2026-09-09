/**
 * One-time badge backfill — grant existing members every badge they already
 * earned, notifications suppressed. Idempotent / re-runnable.
 *
 *   npx tsx scripts/backfill-badges.ts
 *
 * Run AFTER the catalogue is seeded (scripts/seed-badges.ts). Respects
 * DATABASE_URL — check it before running (may point at production).
 */
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { backfillAllUsers } from "../src/modules/badges/cron";

// backfillAllUsers uses the app prisma singleton (@/lib/prisma) via evaluate-user,
// which reads DATABASE_URL itself — this pool just ensures a clean shutdown.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("Backfilling badges for all users (notifications suppressed)…");
  const res = await backfillAllUsers();
  console.log(`Done: evaluated ${res.users} users, granted ${res.granted} badges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
