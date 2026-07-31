// SAFETY: integration tests write to a database. This guard runs before every
// integration test file and HARD-FAILS if DATABASE_URL is anything but a local
// host — so a stray/prod DATABASE_URL (Supabase, Vercel, etc.) can never be
// truncated or mutated by the suite.
const url = process.env.DATABASE_URL ?? "";
let host = "";
try {
  host = new URL(url).hostname;
} catch {
  throw new Error(`Integration tests: DATABASE_URL is not a valid URL: "${url}"`);
}
const LOCAL = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
if (!LOCAL.has(host)) {
  throw new Error(
    `Integration tests refused: DATABASE_URL host "${host}" is not local. ` +
      `These tests only run against a throwaway local DB, never production.`,
  );
}
if (!/_test(\W|$)/.test(new URL(url).pathname)) {
  throw new Error(
    `Integration tests refused: database name must end in "_test" (got "${new URL(url).pathname}").`,
  );
}
