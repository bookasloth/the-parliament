-- Fix: Supabase Realtime private channels were rejecting every subscribe with
-- "Unauthorized: You do not have permissions to read from this Channel topic".
--
-- The realtime.messages policies authorize `conversation:<id>` topics with a
-- subquery over public.conversation_participants. RLS is enabled on every public
-- table but no table has a policy, so that subquery returned zero rows for the
-- `authenticated` role and authorization always failed — killing instant
-- delivery, typing indicators, presence and read receipts.
--
-- One narrow SELECT policy: an authenticated client may see only its OWN
-- participant rows. The app itself connects as the table owner and bypasses RLS,
-- so nothing else changes.
--
-- Guarded: local dev/test Postgres has no `auth` schema or `authenticated` role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    DROP POLICY IF EXISTS "own participant rows" ON public.conversation_participants;
    EXECUTE $p$
      CREATE POLICY "own participant rows" ON public.conversation_participants
        FOR SELECT TO authenticated
        USING (user_id = (SELECT auth.uid()))
    $p$;
  END IF;
END $$;
