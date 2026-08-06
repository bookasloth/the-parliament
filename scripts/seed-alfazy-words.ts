/**
 * Seed the Alfazy game row (per school) + word dictionary — no psql needed.
 * Idempotent: safe to re-run.
 *   npx tsx scripts/seed-alfazy-words.ts
 * Respects DATABASE_URL (may be production — check first).
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { ALFAZY_WORDS } from "../src/config/alfazy-words";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // validate list
  const seen = new Set<string>();
  ALFAZY_WORDS.forEach((w, i) => {
    if (!/^[A-Z]{5}$/.test(w)) throw new Error(`word #${i} "${w}" not 5 uppercase letters`);
    if (seen.has(w)) throw new Error(`duplicate "${w}" at idx ${i}`);
    seen.add(w);
  });

  // 1. register Alfazy for every school lacking it
  const schools = await prisma.school.findMany({ select: { id: true } });
  let games = 0;
  for (const s of schools) {
    const existing = await prisma.game.findFirst({ where: { schoolId: s.id, key: "alfazy" }, select: { id: true } });
    if (!existing) {
      await prisma.game.create({
        data: { schoolId: s.id, key: "alfazy", title: "Alfazy", genre: "word", mode: "single", config: {}, isActive: true },
      });
      games++;
    }
  }

  // 2. upsert dictionary by idx
  for (let i = 0; i < ALFAZY_WORDS.length; i++) {
    await prisma.alfazyWord.upsert({
      where: { idx: i },
      create: { idx: i, word: ALFAZY_WORDS[i], isActive: true },
      update: { word: ALFAZY_WORDS[i], isActive: true },
    });
  }

  console.log(`OK: ${games} Alfazy game row(s) created, ${ALFAZY_WORDS.length} words seeded.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
