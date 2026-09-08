-- Repost-as-object (audit): a repost is a Post pointing at the original it
-- reshares. Idempotent add-column + FK + indexes (safe if hand-applied then
-- re-deployed). Existing rows get NULL repost_of_id, so the partial-ish unique
-- (nulls distinct in Postgres) never conflicts with normal posts.
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "repost_of_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_repost_of_id_fkey') THEN
    ALTER TABLE "posts"
      ADD CONSTRAINT "posts_repost_of_id_fkey"
      FOREIGN KEY ("repost_of_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "posts_repost_of_id_idx" ON "posts" ("repost_of_id");
CREATE UNIQUE INDEX IF NOT EXISTS "posts_author_id_repost_of_id_key" ON "posts" ("author_id", "repost_of_id");
