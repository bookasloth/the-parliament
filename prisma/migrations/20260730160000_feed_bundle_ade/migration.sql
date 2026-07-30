-- Bundle A: post metadata columns
ALTER TABLE "posts"
  ADD COLUMN "quote_source" TEXT,
  ADD COLUMN "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "text_bg" VARCHAR(20),
  ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;

-- Bundle D: "not interested" / hidden posts
CREATE TABLE "hidden_posts" (
  "user_id" UUID NOT NULL,
  "post_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "hidden_posts_pkey" PRIMARY KEY ("user_id", "post_id")
);
CREATE INDEX "hidden_posts_user_id_idx" ON "hidden_posts" ("user_id");
ALTER TABLE "hidden_posts"
  ADD CONSTRAINT "hidden_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hidden_posts"
  ADD CONSTRAINT "hidden_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
