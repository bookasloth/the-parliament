-- Vyapaar wallet ledger: a user reads only their own rows; all writes are
-- service-role only (append-only audit). Run manually on prod (like messaging RLS).
ALTER TABLE "vyapaar_ledger" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vyapaar_ledger_select_own" ON "vyapaar_ledger";
CREATE POLICY "vyapaar_ledger_select_own" ON "vyapaar_ledger"
  FOR SELECT USING ("user_id" = auth.uid());
-- No INSERT/UPDATE/DELETE policies: only the service role (which bypasses RLS) writes.
