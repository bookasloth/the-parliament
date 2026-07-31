// Applies pending Prisma migrations during PRODUCTION Vercel builds only.
//
// Why: Vercel auto-deploys merged code, but the build otherwise never runs
// `migrate deploy` — so schema drifts behind code and a migration-replaces-code
// PR ships a live bug. Running it here keeps schema + code shipping together.
//
// Gated on VERCEL_ENV === "production" so it never touches prod from a PREVIEW
// build (an open PR's migration must not reach prod before merge) or a LOCAL
// `npm run build`. If a migration fails, the build fails — deploy is blocked,
// which is the safe outcome.
import { execSync } from "node:child_process";

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

console.log("[prod-migrate] production build — applying pending migrations…");
execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DIRECT_URL: url } });
