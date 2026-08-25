-- Vyapaar M5a RLS audit — close a hidden-information leak.
--
-- FINDING: vyapaar_match has a row-level SELECT policy granting each player read
-- access to their match row (needed so the realtime subscribe gate can resolve, and
-- as belt-and-suspenders). But that lets a player read the row's sensitive columns
-- directly via supabase-js with the publishable key:
--   seed        — the deterministic PRNG seed; ALL future dice + card draws are
--                 computable from it → a player could precompute every future roll.
--   state       — the live GameState JSON, which itself embeds seed, the live rng
--                 cursor, and full (headline/upi) deck order → same leak.
--   action_log  — the replay log (past moves; low risk alone, but revoked for parity
--                 since no client path reads it via supabase-js either).
--
-- The app never reads these columns through supabase-js — MatchBoard fetches the
-- seat-tailored publicView from /api/vyapaar/[matchId]/view (server, Prisma owner
-- role) and only *subscribes* to realtime. So revoking column-level SELECT on the
-- three sensitive columns from the client roles closes the leak with zero app impact.
-- Row SELECT stays intact (safe columns + the realtime EXISTS gate still resolve).
--
-- Column privileges are independent of RLS; Prisma connects as the table owner and
-- bypasses both, so all server reads/writes are unaffected.
--
-- Guarded so local dev/test Postgres (no Supabase `anon`/`authenticated` roles)
-- skips cleanly. Run manually on prod (like the other vyapaar RLS files).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE SELECT (seed, state, action_log) ON public.vyapaar_match FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE SELECT (seed, state, action_log) ON public.vyapaar_match FROM anon;
  END IF;
END $$;

-- Verify after applying (should list only the safe columns for the client roles):
--   SELECT grantee, column_name FROM information_schema.column_privileges
--   WHERE table_name = 'vyapaar_match' AND grantee IN ('anon','authenticated')
--   ORDER BY grantee, column_name;
