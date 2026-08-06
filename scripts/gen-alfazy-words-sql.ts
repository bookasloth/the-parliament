/**
 * Emits the Alfazy dictionary seed SQL to stdout (and validates the word list).
 * Run: npx tsx scripts/gen-alfazy-words-sql.ts > prisma/seed-alfazy-words.sql
 *
 * Idempotent SQL: registers the Alfazy game row for every school, then upserts
 * each dictionary word by idx. Safe to re-run.
 */
import { ALFAZY_WORDS } from "../src/config/alfazy-words";

// ---- validate the source list ----
const seen = new Set<string>();
ALFAZY_WORDS.forEach((w, i) => {
  if (!/^[A-Z]{5}$/.test(w)) throw new Error(`word #${i} "${w}" is not 5 uppercase letters`);
  if (seen.has(w)) throw new Error(`duplicate word "${w}" at idx ${i}`);
  seen.add(w);
});

const lines: string[] = [];
lines.push("-- Alfazy seed: game row (per school) + word dictionary. Idempotent.");
lines.push("");
lines.push(`-- 1. Register the Alfazy game for every school that doesn't have it yet.`);
lines.push(`INSERT INTO "games" ("id", "school_id", "key", "title", "genre", "mode", "config", "is_active", "created_at")`);
lines.push(`SELECT gen_random_uuid(), s."id", 'alfazy', 'Alfazy', 'word', 'single', '{}'::jsonb, true, CURRENT_TIMESTAMP`);
lines.push(`FROM "schools" s`);
lines.push(`WHERE NOT EXISTS (SELECT 1 FROM "games" g WHERE g."school_id" = s."id" AND g."key" = 'alfazy');`);
lines.push("");
lines.push(`-- 2. Word dictionary (idx = daily puzzle sequence).`);
for (let i = 0; i < ALFAZY_WORDS.length; i++) {
  lines.push(
    `INSERT INTO "alfazy_words" ("id","idx","word","is_active") VALUES (gen_random_uuid(), ${i}, '${ALFAZY_WORDS[i]}', true) ON CONFLICT ("idx") DO UPDATE SET "word" = EXCLUDED."word", "is_active" = true;`,
  );
}
lines.push("");

process.stdout.write(lines.join("\n") + "\n");
process.stderr.write(`OK: ${ALFAZY_WORDS.length} unique 5-letter words validated.\n`);
