-- Reconcile poll_options with schema.prisma (PollOption.pollId → poll_id).
--
-- Drift origin: the hand-written 20260612090000_google_auth_onboarding migration
-- created "poll_options" with a "post_id" column (copy-pasted from the sibling
-- poll tables), but the schema — and every read via feed postSelect
-- (src/modules/feed/query.ts, poll.options) — references "poll_id" → polls(id).
-- Prod was hand-patched to "poll_id" through the manual-SQL-on-Supabase workflow,
-- so the live DB already carries poll_id while the migration files never recorded
-- the rename. A fresh `prisma migrate deploy` (which the integration-test
-- global-setup runs to build the throwaway *_test DB) therefore produced
-- poll_options WITHOUT poll_id, so any poll-selecting query threw
--   "column poll_options.poll_id does not exist"
-- making every feed/profile/getPostById integration test unrunnable.
--
-- Idempotent by design: the rename fires only when post_id is present and poll_id
-- is not, so this is a clean no-op on a DB that already has poll_id (prod). The
-- sibling tables "polls" (post_id, correct) and "poll_votes" (poll_id, correct)
-- have no column drift and need no change.
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
