-- Notification aggregation (audit N-1): track distinct-actor count + recent ids
-- so a coalesced burst reads "Priya and N others" instead of overwriting to the
-- latest actor. Idempotent add-columns (safe if hand-applied then re-deployed).
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "actor_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "actor_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
