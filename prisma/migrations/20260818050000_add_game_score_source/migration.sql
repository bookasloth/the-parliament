-- Archive support: mark each play as "daily" (live puzzle) or "archive" (catch-up).
-- Only "daily" rows count on leaderboards and streaks.
ALTER TABLE "game_scores" ADD COLUMN "source" VARCHAR(8) NOT NULL DEFAULT 'daily';
