-- Vyapaar wallet ledger: a user reads only their own rows; all writes go through
-- the DB owner role Prisma connects as (bypasses RLS) (append-only audit). Run manually on prod (like messaging RLS).
ALTER TABLE "vyapaar_ledger" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vyapaar_ledger_select_own" ON "vyapaar_ledger";
CREATE POLICY "vyapaar_ledger_select_own" ON "vyapaar_ledger"
  FOR SELECT USING ("user_id" = auth.uid());
-- No INSERT/UPDATE/DELETE policies: only the DB owner role Prisma connects as (bypasses RLS) writes.
