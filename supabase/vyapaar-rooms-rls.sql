-- Vyapaar rooms: members read their rooms; anyone reads open public rooms.
-- All writes are via the DB owner role Prisma connects as (bypasses RLS).
ALTER TABLE "vyapaar_room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vyapaar_room_member" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vyapaar_room_select_public" ON "vyapaar_room";
CREATE POLICY "vyapaar_room_select_public" ON "vyapaar_room"
  FOR SELECT USING (status = 'open' AND visibility = 'public');

DROP POLICY IF EXISTS "vyapaar_room_select_member" ON "vyapaar_room";
CREATE POLICY "vyapaar_room_select_member" ON "vyapaar_room"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "vyapaar_room_member" m WHERE m.room_id = "vyapaar_room".id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "vyapaar_room_member_select_own_room" ON "vyapaar_room_member";
CREATE POLICY "vyapaar_room_member_select_own_room" ON "vyapaar_room_member"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "vyapaar_room_member" me WHERE me.room_id = "vyapaar_room_member".room_id AND me.user_id = auth.uid())
  );
-- No INSERT/UPDATE/DELETE policies: only the DB owner role Prisma connects as (bypasses RLS) writes.
