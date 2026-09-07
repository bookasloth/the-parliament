-- ============================================================================
-- PROD reconciliation: poll_options.poll_id  (migration 20260907000000)
-- Run on Supabase (SQL editor) against the PRODUCTION db, session/DIRECT connection.
-- Idempotent + transactional: safe to run once. A no-op if prod is already correct.
-- ============================================================================
--
-- WHY:  the hand-written 20260612090000 migration created poll_options with a
--       `post_id` column; schema.prisma + every feed query use `poll_id`.
--       Prod was hand-patched to poll_id long ago, but _prisma_migrations never
--       recorded a rename migration, so the ledger is drifted from the files.
--
-- YOU MAY NOT NEED THIS.  Migration 20260907000000 is idempotent, so a normal
-- `prisma migrate deploy` on deploy will apply it as a safe no-op (prod already
-- has poll_id) and record the ledger row itself. Run this script ONLY if the
-- deploy migrate step is jammed (Prod=Error) and you want to reconcile by hand.

BEGIN;

-- 1. Schema: rename post_id -> poll_id only if that's the actual shape (no-op if
--    prod already carries poll_id).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'poll_options' AND column_name = 'post_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'poll_options' AND column_name = 'poll_id'
  ) THEN
    ALTER TABLE "poll_options" RENAME COLUMN "post_id" TO "poll_id";
  END IF;
END $$;

-- 2. Ledger: record the migration as applied so `migrate deploy` skips it.
--    checksum = sha256 of prisma/migrations/20260907000000_poll_options_poll_id/migration.sql
--    (LF line endings, as checked out on Linux/Vercel). Verified against a fresh
--    local migrate-deploy: Prisma stores exactly this value.
--    WHERE NOT EXISTS guards on migration_name (there is no unique constraint on
--    it) so this is a no-op if the deploy pipeline already inserted the row — and
--    never creates a duplicate migration_name, which Prisma would reject.
INSERT INTO "_prisma_migrations"
  (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
SELECT
  gen_random_uuid()::text,
  '49e218296dd641c563c65bd59214cc6159f22bcce8243dc1a2b28ed4e3f655e5',
  '20260907000000_poll_options_poll_id',
  now(), now(), 1
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations"
  WHERE migration_name = '20260907000000_poll_options_poll_id'
);

COMMIT;

-- Verify:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='poll_options' ORDER BY 1;               -- expect poll_id, not post_id
--   SELECT migration_name, finished_at FROM "_prisma_migrations"
--     WHERE migration_name='20260907000000_poll_options_poll_id';

-- ----------------------------------------------------------------------------
-- ALTERNATIVE to step 2 (if you'd rather Prisma write the ledger row): after the
-- schema is correct, run against prod (DIRECT_URL) instead of the INSERT above:
--   npx prisma migrate resolve --applied 20260907000000_poll_options_poll_id
-- It computes the checksum from the file, so no hardcoded hash to keep in sync.
-- ----------------------------------------------------------------------------
