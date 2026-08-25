-- Vyapaar matches: readable only by their players; all writes via the DB owner role Prisma connects as (bypasses RLS).
ALTER TABLE "vyapaar_match" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vyapaar_match_player" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vyapaar_match_select_player" ON "vyapaar_match";
CREATE POLICY "vyapaar_match_select_player" ON "vyapaar_match"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "vyapaar_match_player" p WHERE p.match_id = "vyapaar_match".id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "vyapaar_match_player_select_own_match" ON "vyapaar_match_player";
CREATE POLICY "vyapaar_match_player_select_own_match" ON "vyapaar_match_player"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "vyapaar_match_player" me WHERE me.match_id = "vyapaar_match_player".match_id AND me.user_id = auth.uid())
  );
-- No INSERT/UPDATE/DELETE policies: only the DB owner role Prisma connects as (bypasses RLS) writes.
-- Note: state JSON holds server-only fields; reads must go through the server's publicView, never raw supabase-js. RLS here is belt-and-suspenders.
