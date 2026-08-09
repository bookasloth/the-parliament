// Applies pending Prisma migrations during PRODUCTION Vercel builds only.
//
// Why: Vercel auto-deploys merged code, but the build otherwise never runs
// `migrate deploy` — so schema drifts behind code and a migration-replaces-code
// PR ships a live bug. Running it here keeps schema + code shipping together.
//
// Gated on VERCEL_ENV === "production" so it never touches prod from a PREVIEW
// build (an open PR's migration must not reach prod before merge) or a LOCAL
// `npm run build`. If a migration fails, the build fails — deploy is blocked,
// which is the safe outcome (never ship code against an unmigrated schema).
//
// Drift escape hatch: this codebase applies some migrations manually on Supabase,
// which leaves `_prisma_migrations` out of sync with the files. That jams
// `migrate deploy` (P3009 / "already exists") and blocks EVERY future deploy until
// someone with DB access runs `migrate resolve`. To fix that from Vercel alone
// (no DB shell), set one of these prod env vars, redeploy, then UNSET it:
//   PRISMA_RESOLVE_APPLIED="<name>[,<name>]"      → mark applied WITHOUT running SQL
//                                                    (use when the objects already exist)
//   PRISMA_RESOLVE_ROLLED_BACK="<name>[,<name>]"  → clear a failed row so it re-runs
// Each resolve is best-effort (a no-op if already recorded), so a stale var can't
// break a healthy deploy. This is an explicit operator override — same trust as
// running `migrate resolve` by hand, just reachable without DB credentials.
import { execSync } from "node:child_process";
import { parseMigrationList } from "./lib/parse-migration-list.mjs";

const env = process.env.VERCEL_ENV ?? "unset";
if (env !== "production") {
  console.log(`[prod-migrate] skip — VERCEL_ENV=${env} (only runs on production builds)`);
  process.exit(0);
}

// Migrations require a DIRECT/session connection, NOT the pgbouncer transaction
// pooler (DATABASE_URL). If DIRECT_URL isn't configured, skip rather than fail
// the deploy — safer rollout. Set DIRECT_URL in Vercel prod env to enable this.
let url = process.env.DIRECT_URL;
if (!url) {
  console.warn(
    "[prod-migrate] DIRECT_URL not set — SKIPPING auto-migrate. " +
      "Set DIRECT_URL (Supabase session pooler, port 5432) in Vercel prod env, " +
      "then migrations apply automatically. Until then, run `migrate deploy` manually.",
  );
  process.exit(0);
}
// Supabase requires SSL for the direct connection.
if (!/sslmode=/.test(url)) url += (url.includes("?") ? "&" : "?") + "sslmode=require";

const runEnv = { ...process.env, DIRECT_URL: url };
const run = (cmd) => execSync(cmd, { stdio: "inherit", env: runEnv });

// Operator drift overrides (best-effort — never fatal on their own).
function applyResolves(rawEnvVar, flag, label) {
  const { valid, invalid } = parseMigrationList(process.env[rawEnvVar]);
  for (const bad of invalid) {
    console.warn(`[prod-migrate] ignoring invalid ${rawEnvVar} entry "${bad}" (not a migration name)`);
  }
  for (const name of valid) {
    try {
      console.log(`[prod-migrate] ${label}: migrate resolve ${flag} ${name}`);
      run(`npx prisma migrate resolve ${flag} ${name}`);
    } catch (e) {
      console.warn(`[prod-migrate] resolve ${flag} ${name} skipped: ${e.message}`);
    }
  }
}

applyResolves("PRISMA_RESOLVE_ROLLED_BACK", "--rolled-back", "clear failed migration");
applyResolves("PRISMA_RESOLVE_APPLIED", "--applied", "mark applied (drift)");

console.log("[prod-migrate] production build — applying pending migrations…");
try {
  run("npx prisma migrate deploy");
} catch (e) {
  // Genuine failures STILL block the deploy (safe). But make the block
  // self-diagnosing: dump status + the exact one-env-var fix, so nobody has to
  // dig through Vercel logs or open a DB shell to unjam it.
  console.error(`[prod-migrate] migrate deploy FAILED — schema NOT advanced, deploy blocked (safe outcome).`);
  console.error(`[prod-migrate] error: ${e.message}`);
  console.error("[prod-migrate] --- current migration status ---");
  try { run("npx prisma migrate status"); } catch { /* status itself may exit non-zero; ignore */ }
  console.error(
    "[prod-migrate] If this is DRIFT (migration already applied out-of-band → 'already exists'): " +
      "set PRISMA_RESOLVE_APPLIED=<migration_name> in Vercel prod env and redeploy, then unset it. " +
      "If a prior attempt left a FAILED/rolled-back row: use PRISMA_RESOLVE_ROLLED_BACK=<migration_name>.",
  );
  process.exit(1);
}
