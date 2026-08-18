-- Alfazy pre-launch cleanup — wipe all test/pre-launch play records.
--
-- Keeps intact: the game row(s) (`games` key='alfazy'), the word dictionary
-- (`alfazy_words`), and all game config. Only the play footprint is removed:
--   * game_scores    — one row per user per day (the plays themselves)
--   * game_champions — frozen period winners (Hall of Champions / trophy case)
-- Everything else (leaderboards, streaks, trophy case) is derived live from
-- these two tables, so wiping them resets the game to zero for the 1 Sept launch.
-- A play awards 0 karma (GAME_KARMA_HARD_CAP), so there is NO karma ledger to reverse.
--
-- Run on Supabase. Idempotent — safe to re-run.

-- Pre-check: how many rows will go (run on its own first if you want to eyeball it).
SELECT
  (SELECT count(*) FROM game_scores    WHERE game_id IN (SELECT id FROM games WHERE key = 'alfazy')) AS plays,
  (SELECT count(*) FROM game_champions WHERE game_id IN (SELECT id FROM games WHERE key = 'alfazy')) AS champions;

BEGIN;

WITH g AS (SELECT id FROM games WHERE key = 'alfazy')
DELETE FROM game_scores WHERE game_id IN (SELECT id FROM g);

WITH g AS (SELECT id FROM games WHERE key = 'alfazy')
DELETE FROM game_champions WHERE game_id IN (SELECT id FROM g);

COMMIT;
