-- Comment edit marker (audit P1-20). Idempotent.
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "edited_at" timestamptz;
-- Pagination keyset: top-level comments ordered by (post_id, created_at).
CREATE INDEX IF NOT EXISTS "comments_post_id_created_at_idx" ON "comments" ("post_id", "created_at");
