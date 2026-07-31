import { execSync } from "node:child_process";
import { Client } from "pg";

// Ensures the local *_test DB exists and is migrated before the E2E dev server
// boots. Idempotent (no drop) — fast on reuse. Guards against ever pointing at
// a non-local / non-_test database.
const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/the_parliament_test";

const LOCAL = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export default async function globalSetup() {
  const u = new URL(TEST_URL);
  const dbName = u.pathname.replace(/^\//, "");
  if (!LOCAL.has(u.hostname)) throw new Error(`E2E refused: host "${u.hostname}" is not local`);
  if (!dbName.endsWith("_test")) throw new Error(`E2E refused: db "${dbName}" must end in _test`);

  const admin = new Client({
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: "postgres",
  });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL },
  });
}
