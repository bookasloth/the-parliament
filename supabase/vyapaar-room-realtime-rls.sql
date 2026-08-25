-- Realtime authorization for Vyapaar ROOM lobby broadcasts.
-- Run manually on Supabase (realtime.messages topic policies live in the DB, not Prisma).
--
-- The room page subscribes to the private `vyapaar-room:<roomId>` channel; the server
-- broadcasts "lobby" (join/leave) and "started" (match created) on it with the service-role
-- key (bypasses RLS), so only the SUBSCRIBE side needs a policy. Without it every subscribe is
-- rejected and the lobby won't update live / members won't auto-enter the game.
--
-- Gate: an authenticated user may receive on `vyapaar-room:<id>` only if they are a member of
-- that room. Guarded so local dev/test Postgres (no auth schema / authenticated role) skips it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    DROP POLICY IF EXISTS "vyapaar room members can receive" ON realtime.messages;
    EXECUTE $p$
      CREATE POLICY "vyapaar room members can receive" ON realtime.messages
        FOR SELECT TO authenticated
        USING (
          realtime.topic() LIKE 'vyapaar-room:%'
          AND EXISTS (
            SELECT 1 FROM public.vyapaar_room_member m
            WHERE m.room_id = split_part(realtime.topic(), ':', 2)::uuid
              AND m.user_id = (SELECT auth.uid())
          )
        )
    $p$;
  END IF;
END $$;

-- Verify after applying:
--   SELECT policyname FROM pg_policies WHERE schemaname='realtime' AND tablename='messages';
