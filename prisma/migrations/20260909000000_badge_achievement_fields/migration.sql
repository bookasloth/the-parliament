-- Badge & achievement system — Phase 0 schema.
-- Extends the existing badges / user_badges tables and adds denormalized
-- achievement score/count to users. IF NOT EXISTS makes manual apply re-runnable.

-- badges: catalogue metadata + rule fields
ALTER TABLE "badges"
  ADD COLUMN IF NOT EXISTS "category"         VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "rarity"           VARCHAR(20) NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS "award_mode"       VARCHAR(10) NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS "is_hidden"        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "display_priority" INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "series_key"       VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "series_order"     INTEGER,
  ADD COLUMN IF NOT EXISTS "progress_target"  INTEGER,
  ADD COLUMN IF NOT EXISTS "active_from"      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "active_to"        TIMESTAMPTZ;

-- user_badges: in-progress value for progress bars
ALTER TABLE "user_badges"
  ADD COLUMN IF NOT EXISTS "progress" INTEGER;

-- users: denormalized achievement score + badge count
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "achievement_score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "badge_count"        INTEGER NOT NULL DEFAULT 0;
