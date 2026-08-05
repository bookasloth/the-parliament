import { Client } from "pg";
import bcrypt from "bcryptjs";

// Credentials for the E2E authed smoke user. Kept trivial — this only ever
// exists in the throwaway local *_test DB.
export const TEST_USER = {
  email: "e2e-smoke@test.local",
  password: "E2ePass!234",
  username: "e2e-smoke",
  name: "E2E Smoke",
};

const LOCAL = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

/**
 * Idempotently seed a verified, onboarding-complete member into the local
 * *_test DB so the authed smoke can log in. Raw SQL over an EXPLICIT test-DB
 * connection (never the app's prod singleton); hard-refuses any non-local /
 * non-_test URL. Only email/legal_name/updated_at lack DB defaults — everything
 * else falls back to the schema defaults.
 */
export async function seedTestUser(dbUrl: string): Promise<void> {
  const u = new URL(dbUrl);
  const dbName = u.pathname.replace(/^\//, "");
  if (!LOCAL.has(u.hostname)) throw new Error(`seedTestUser refused: host "${u.hostname}" is not local`);
  if (!dbName.endsWith("_test")) throw new Error(`seedTestUser refused: db "${dbName}" must end in _test`);

  const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO users (email, legal_name, display_name, username, password_hash,
                          email_verified_at, onboarding_completed, onboarding_step, is_verified, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), true, 'complete', true, now())
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         email_verified_at = now(),
         onboarding_completed = true,
         onboarding_step = 'complete',
         is_verified = true,
         username = EXCLUDED.username,
         updated_at = now()`,
      [TEST_USER.email, TEST_USER.name, TEST_USER.name, TEST_USER.username, passwordHash],
    );
  } finally {
    await client.end();
  }
}
