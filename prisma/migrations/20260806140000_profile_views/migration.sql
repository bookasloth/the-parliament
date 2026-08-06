-- Profile views — "who viewed your profile" tracking for the weekly re-engagement email.
CREATE TABLE "profile_views" (
    "profile_user_id" UUID NOT NULL,
    "viewer_id" UUID NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "last_viewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("profile_user_id","viewer_id")
);

CREATE INDEX "profile_views_profile_user_id_last_viewed_at_idx" ON "profile_views"("profile_user_id","last_viewed_at");

ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profile_user_id_fkey" FOREIGN KEY ("profile_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
