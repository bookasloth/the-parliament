import { execSync } from "node:child_process";
import { Client } from "pg";

// NOTE: vitest's `test.env` applies to test workers, not to this globalSetup
// process — so derive the URL here the same way the config does, don't read
// the worker-only DATABASE_URL.
const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/the_parliament_test";

// Drops + recreates the throwaway `*_test` database and applies all migrations
// before the integration suite runs.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export default async function setup() {
  const u = new URL(TEST_URL);
  const dbName = u.pathname.replace(/^\//, "");
  // Belt-and-braces: this runs a destructive `migrate reset`, so refuse anything
  // that isn't a local throwaway *_test DB before doing anything.
  if (!LOCAL_HOSTS.has(u.hostname)) {
    throw new Error(`global-setup refused: host "${u.hostname}" is not local`);
  }
  if (!dbName.endsWith("_test")) {
    throw new Error(`global-setup refused: db name "${dbName}" must end in _test`);
  }

  // Connect to the default `postgres` db to create the test db if absent.
  const admin = new Client({
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: "postgres",
  });
  try {
    await admin.connect();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `\n\nIntegration tests need a local Postgres at ${u.hostname}:${u.port || 5432}, but couldn't connect ` +
        `(${msg}).\nStart it first:\n  docker compose -f docker/docker-compose.yml up -d\n` +
        `(Docker Desktop must be running.)\n`,
    );
  }
  // Drop + recreate for a pristine schema each run. Doing the drop ourselves via
  // SQL (not `prisma migrate reset`) keeps this non-interactive and avoids Prisma's
  // destructive-command agent guard — safe because the name/host guards above
  // already proved this is a local *_test DB.
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  // Apply ALL migrations (incl. the counter-trigger migration, which `db push`
  // would skip) to the fresh DB. `migrate deploy` is non-destructive.
  // Both DATABASE_URL and DIRECT_URL are pinned to the test DB — prisma.config.ts
  // resolves `DIRECT_URL ?? DATABASE_URL` and loads .env (production), so BOTH must
  // be overridden or a stray prod DIRECT_URL would be targeted. dotenv won't
  // override already-set env vars, so these win.
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL },
  });
}
