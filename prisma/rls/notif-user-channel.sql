-- Realtime Authorization for the per-user private channel `user:<uuid>`.
-- Run once in the Supabase SQL editor of the Parliament project (ref plyoesxuiltefxgojbeh).
--
-- This channel carries: the notification-bell live nudge, AND the incoming
-- video-call ring (events `incoming_call` / `call_ended`). Without this policy a
-- client's subscribe to `user:<their id>` is REJECTED ("You do not have
-- permissions to read from this Channel topic"), so the bell silently falls back
-- to its 5-min poll and the call ring never fires instantly (the 8s /api/calls/
-- incoming poll is the only thing that saves it).
--
-- Shape mirrors the WORKING conversation policy (messaging-realtime-rls.sql):
-- bare `topic` column + `auth.uid()`. The channel is broadcast-only from the
-- server (service-role key, bypasses RLS), so the client only needs SELECT to
-- RECEIVE — no INSERT policy (the client never sends on this channel).
--
-- auth.uid() = the `sub` of the JWT minted by signRealtimeToken (= the app user
-- id). Topic is `user:<that id>`, so split_part(topic,':',2) must equal it.
--
-- RLS is already enabled on realtime.messages by default (you don't own that
-- table, so `alter table ... enable rls` errors with "must be owner"). Just
-- create the policy.

drop policy if exists "own user channel can receive" on realtime.messages;

create policy "own user channel can receive"
on realtime.messages
for select
to authenticated
using (
  topic like 'user:%'
  and split_part(topic, ':', 2) = auth.uid()::text
);

-- Verify after applying:
--   select policyname from pg_policies
--   where schemaname = 'realtime' and tablename = 'messages';
