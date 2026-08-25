-- Realtime authorization for Vyapaar match state broadcasts.
-- Run manually on Supabase (the realtime.messages topic policies live in the
-- DB, not in Prisma migrations — see prisma/rls/notif-user-channel.sql).
--
-- The client subscribes to the private `vyapaar-match:<matchId>` channel and
-- the server broadcasts state changes on it with the service-role key
-- (bypasses RLS), so only the subscribe side needs a policy. Without one,
-- every subscribe is rejected with "Unauthorized: You do not have
-- permissions to read from this Channel topic" — same failure mode fixed for
-- the conversation and notification-bell channels.
--
-- Gate: an authenticated user may receive broadcasts on `vyapaar-match:<id>`
-- only if they are a vyapaar_match_player of that match.
--
-- Guarded so local dev/test Postgres (no `auth` schema / `authenticated`
-- role) skips it cleanly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    DROP POLICY IF EXISTS "vyapaar match players can receive" ON realtime.messages;
    EXECUTE $p$
      CREATE POLICY "vyapaar match players can receive" ON realtime.messages
        FOR SELECT TO authenticated
        USING (
          realtime.topic() LIKE 'vyapaar-match:%'
          AND EXISTS (
            SELECT 1 FROM public.vyapaar_match_player p
            WHERE p.match_id = split_part(realtime.topic(), ':', 2)::uuid
              AND p.user_id = (SELECT auth.uid())
          )
        )
    $p$;
  END IF;
END $$;

-- Verify after applying:
--   SELECT policyname FROM pg_policies
--   WHERE schemaname = 'realtime' AND tablename = 'messages';
