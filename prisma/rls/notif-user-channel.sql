-- Realtime notification bell — authorize each authenticated user to SUBSCRIBE to
-- their OWN private channel, topic `user:<their uid>`. Apply MANUALLY on Supabase
-- (the realtime.messages topic policies live in the DB, not in Prisma migrations).
--
-- How Supabase Realtime private channels work: a subscribe is gated by RLS on
-- `realtime.messages`. This SELECT policy lets the `authenticated` role read
-- broadcasts whose topic equals `user:` + their own auth.uid(). The SERVER
-- broadcasts with the service-role key (bypasses RLS), so only the subscribe
-- side needs a policy — no helper table/subquery (the topic encodes the uid).
--
-- Mirrors the existing conversation-channel authorization. If your conversation
-- policy on realtime.messages is shaped differently (e.g. checks `extension`),
-- mirror THAT shape here so both channels authorize consistently.
--
-- Guarded so local dev/test Postgres (no `auth` schema / `authenticated` role)
-- skips it cleanly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    DROP POLICY IF EXISTS "own user notification channel" ON realtime.messages;
    EXECUTE $p$
      CREATE POLICY "own user notification channel" ON realtime.messages
        FOR SELECT TO authenticated
        USING ( realtime.topic() = 'user:' || (SELECT auth.uid())::text )
    $p$;
  END IF;
END $$;

-- Verify after applying:
--   SELECT policyname FROM pg_policies
--   WHERE schemaname = 'realtime' AND tablename = 'messages';
