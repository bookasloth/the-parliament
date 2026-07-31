import { execSync } from "node:child_process";
import { Client } from "pg";

// NOTE: vitest's `test.env` applies to test workers, not to this globalSetup
// process — so derive the URL here the same way the config does, don't read
// the worker-only DATABASE_URL.
const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/the_parliament_test";

// Creates the throwaway `*_test` database (if missing) and pushes the Prisma
// schema into it before the integration suite runs. Idempotent.
export default async function setup() {
  const u = new URL(TEST_URL);
  const dbName = u.pathname.replace(/^\//, "");
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
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }
  await admin.end();

  // Push the current schema into the test db (no migration history needed).
  // `--url` overrides the datasource directly — critical, because prisma.config.ts
  // resolves `DIRECT_URL ?? DATABASE_URL` from .env (production), so relying on env
  // vars here could target the prod DB. --url pins it to the test DB, no exceptions.
  execSync(`npx prisma db push --url "${TEST_URL}" --accept-data-loss`, {
    stdio: "inherit",
  });
}
