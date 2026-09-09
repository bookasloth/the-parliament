/**
 * Seed the badge catalogue into the `badges` table from `src/config/badges.ts`.
 *
 *   npx tsx scripts/seed-badges.ts
 *
 * Idempotent: upserts by (schoolId, key), so re-running updates labels/criteria/art
 * in place and never duplicates. Scoped to the single existing school.
 * NOTE: DATABASE_URL may point at production — check before running.
 */
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { BADGE_CATALOG } from "../src/config/badges";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const school = await prisma.school.findFirst({ orderBy: { createdAt: "asc" } });
  if (!school) throw new Error("No school row found — seed a school first.");

  let created = 0;
  let updated = 0;
  for (const def of BADGE_CATALOG) {
    const data = {
      label: def.label,
      description: def.description,
      iconUrl: def.iconUrl,
      category: def.category,
      rarity: def.rarity,
      awardMode: def.awardMode,
      isHidden: def.isHidden ?? false,
      seriesKey: def.seriesKey ?? null,
      seriesOrder: def.seriesOrder ?? null,
      displayPriority: def.displayPriority ?? 0,
      progressTarget: def.criteria?.target ?? null,
      autoCriteria: def.criteria ? (def.criteria as unknown as object) : undefined,
    };
    const existing = await prisma.badge.findUnique({
      where: { schoolId_key: { schoolId: school.id, key: def.key } },
    });
    await prisma.badge.upsert({
      where: { schoolId_key: { schoolId: school.id, key: def.key } },
      create: { schoolId: school.id, key: def.key, ...data },
      update: data,
    });
    if (existing) updated++;
    else created++;
  }

  console.log(
    `Badges seeded for school "${school.name}": ${created} created, ${updated} updated, ${BADGE_CATALOG.length} total.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
