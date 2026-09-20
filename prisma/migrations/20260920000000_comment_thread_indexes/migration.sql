-- Comment threaded-read + moderation indexes (audit #487 / §7).
-- IF NOT EXISTS so a manual pre-apply on prod is a no-op and `migrate deploy`
-- never fails on it (mirrors the search-index migrations).
CREATE INDEX IF NOT EXISTS "comments_post_id_parent_id_created_at_idx"
  ON "comments" ("post_id", "parent_id", "created_at");
CREATE INDEX IF NOT EXISTS "comments_author_id_idx"
  ON "comments" ("author_id");
