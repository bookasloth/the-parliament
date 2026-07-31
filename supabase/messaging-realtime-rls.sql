-- Realtime Authorization for 1:1 messaging (Slice 2).
-- Run once in the Supabase SQL editor of the Parliament project (ref plyoesxuiltefxgojbeh).
--
-- Gates the private `conversation:<uuid>` channels: a user may receive broadcasts
-- (SELECT) and send typing/presence (INSERT) only if they are a participant of
-- that conversation. auth.uid() = the `sub` of the JWT minted by
-- signRealtimeToken(). Server-side broadcasts use the service-role key and bypass
-- these policies.
--
-- Note: RLS is already enabled on realtime.messages by default (and you don't
-- own that table, so `alter table ... enable rls` errors with "must be owner").
-- Just create the policies below.

create policy "conversation participants can receive"
on realtime.messages
for select
to authenticated
using (
  topic like 'conversation:%'
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = (split_part(topic, ':', 2))::uuid
      and cp.user_id = auth.uid()
  )
);

create policy "conversation participants can send"
on realtime.messages
for insert
to authenticated
with check (
  topic like 'conversation:%'
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = (split_part(topic, ':', 2))::uuid
      and cp.user_id = auth.uid()
  )
);
