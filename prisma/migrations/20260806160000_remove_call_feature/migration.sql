-- Calling feature removed entirely. Delete the call-log message rows first
-- (identified by type), then drop the columns. Fully idempotent so it's safe
-- whether applied on deploy or run manually on the DB (and safe to re-run).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'type'
  ) THEN
    DELETE FROM "messages" WHERE "type" = 'call';
  END IF;
END $$;

ALTER TABLE "messages" DROP COLUMN IF EXISTS "call_data";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "type";
