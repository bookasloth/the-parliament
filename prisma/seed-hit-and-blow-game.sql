-- Seed the Hit and Blow game row. Required before /games/hit-and-blow works —
-- the app looks up the game by key='hit_and_blow'. Clones Alfazy's school_id,
-- genre, and mode so it lands in the same school. Idempotent (guarded by NOT EXISTS).
--
-- Run on Supabase.

INSERT INTO games (id, school_id, key, title, genre, mode, config, is_active, created_at)
SELECT gen_random_uuid(), a.school_id, 'hit_and_blow', 'Hit and Blow', a.genre, a.mode, '{}'::jsonb, true, now()
FROM games a
WHERE a.key = 'alfazy'
  AND NOT EXISTS (SELECT 1 FROM games WHERE key = 'hit_and_blow');

-- Verify:
SELECT key, title, is_active FROM games WHERE key IN ('alfazy', 'hit_and_blow');
