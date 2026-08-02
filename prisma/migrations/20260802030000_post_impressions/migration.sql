-- Feed seen-tracking: one row per (viewer, post) impression. Powers the
-- never-repeat feed — getFeed excludes recently-seen posts.
CREATE TABLE "post_impressions" (
  "user_id" UUID NOT NULL,
  "post_id" UUID NOT NULL,
  "seen_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "post_impressions_pkey" PRIMARY KEY ("user_id", "post_id")
);
CREATE INDEX "post_impressions_user_id_seen_at_idx" ON "post_impressions" ("user_id", "seen_at");
ALTER TABLE "post_impressions"
  ADD CONSTRAINT "post_impressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_impressions"
  ADD CONSTRAINT "post_impressions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
