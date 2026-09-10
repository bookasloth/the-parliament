-- Ad delivery tracking (value-first ads: powers the ≥10k/yr delivery floor,
-- the make-good, and monthly advertiser reports). New table, no drift risk.
-- Written idempotently (IF NOT EXISTS) so a manual Supabase apply followed by
-- `prisma migrate deploy` on the next deploy is a clean no-op, not a jam.
--
-- Append-only, daily-unique: the unique index lets `createMany(skipDuplicates)`
-- collapse a viewer's same-day repeat views into one row, so delivery counts are
-- honest daily-uniques rather than raw beacon fires.
CREATE TABLE IF NOT EXISTS "ad_impressions" (
    "id" UUID NOT NULL,
    "ad_id" VARCHAR(80) NOT NULL,
    "placement" VARCHAR(20) NOT NULL,
    "kind" VARCHAR(12) NOT NULL,
    "viewer_id" UUID,
    "day" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_impressions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ad_impressions_daily_unique"
    ON "ad_impressions" ("ad_id", "placement", "kind", "viewer_id", "day");

CREATE INDEX IF NOT EXISTS "ad_impressions_ad_id_placement_day_idx"
    ON "ad_impressions" ("ad_id", "placement", "day");

CREATE INDEX IF NOT EXISTS "ad_impressions_day_idx"
    ON "ad_impressions" ("day");
