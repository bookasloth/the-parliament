-- Member referral attribution (audit P1-19). Idempotent.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invited_by_id" uuid;
CREATE INDEX IF NOT EXISTS "users_invited_by_id_idx" ON "users" ("invited_by_id");
