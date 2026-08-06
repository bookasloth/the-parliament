-- Phase 3 — performance indexes (PERFORMANCE_FIX_PLAN.md)
--
-- Apply MANUALLY on prod Supabase (SQL editor or psql). These use
-- CREATE INDEX CONCURRENTLY, which:
--   * does NOT lock the table for writes (safe on a live DB), and
--   * CANNOT run inside a transaction block — run each statement on its own,
--     not wrapped in BEGIN/COMMIT, and not as one multi-statement batch that
--     the client wraps in a txn. In the Supabase SQL editor, run them one at a
--     time (or toggle "single statement"), not all-at-once.
--
-- IF NOT EXISTS makes every statement idempotent/re-runnable. If a CONCURRENTLY
-- build is interrupted it can leave an INVALID index — drop it and re-run:
--   -- SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
--   -- DROP INDEX CONCURRENTLY <name>;
--
-- These are intentionally NOT Prisma migrations: Prisma runs migrations in a
-- transaction (breaks CONCURRENTLY) and the trigram/partial forms don't map
-- cleanly to @@index. Keep the schema.prisma comments below in sync by hand.

-- ─────────────────────────────────────────────────────────────
-- CB-6 — directory search: ILIKE '%q%' can't use a btree index, so
-- name/city/profession search seq-scans users/profiles on every keystroke.
-- Trigram GIN indexes let Postgres use these for ILIKE '%…%' (contains).
-- Cost: extra write overhead on the (infrequent) user/profile edit + disk.
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS users_legal_name_trgm
  ON users    USING gin (legal_name   gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_display_name_trgm
  ON users    USING gin (display_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_username_trgm
  ON users    USING gin (username     gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS profiles_city_trgm
  ON profiles USING gin (city         gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS profiles_profession_trgm
  ON profiles USING gin (profession   gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- SB-3 — Alfazy leaderboard window scan filters (game_id, played_at range) but
-- game_scores only had (game_id, score), (game_id, puzzle_date), (user_id,
-- played_at). This is the exact filter for the window aggregation.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS game_scores_game_played
  ON game_scores (game_id, played_at);

-- ─────────────────────────────────────────────────────────────
-- SB-2 — feed main query: filters school_id + status='visible' + deleted_at IS
-- NULL, orders is_pinned DESC, ranking_score DESC, created_at DESC. The existing
-- @@index([schoolId, rankingScore]) only partially matches. This partial index
-- matches the full shape and stays small (only live+visible rows).
-- MEASURE FIRST: only add if the feed query shows in the slow log / EXPLAIN
-- doesn't already use the existing index well. Harmless but not free to maintain.
-- ─────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS posts_feed_rank
  ON posts (school_id, is_pinned DESC, ranking_score DESC, created_at DESC)
  WHERE deleted_at IS NULL AND status = 'visible';

-- ─────────────────────────────────────────────────────────────
-- Verify usage after applying (should show Index Scan / Bitmap Index Scan, not
-- Seq Scan) — substitute a real school id / search term:
--   EXPLAIN ANALYZE SELECT id FROM users
--     WHERE legal_name ILIKE '%sharma%' LIMIT 20;
--   EXPLAIN ANALYZE SELECT game_id, played_at FROM game_scores
--     WHERE game_id = '<uuid>' AND played_at >= now() - interval '7 days';
-- ─────────────────────────────────────────────────────────────
