-- Seed the Integra game row. Required before /games/integra works — the app
-- looks up the game by key='integra'. Clones Alfazy's school_id, genre, and
-- mode. Idempotent (guarded by NOT EXISTS). Run on Supabase.

INSERT INTO games (id, school_id, key, title, genre, mode, config, is_active, created_at)
SELECT gen_random_uuid(), a.school_id, 'integra', 'Integra', a.genre, a.mode, '{}'::jsonb, true, now()
FROM games a
WHERE a.key = 'alfazy'
  AND NOT EXISTS (SELECT 1 FROM games WHERE key = 'integra');

-- Verify:
SELECT key, title, is_active FROM games WHERE key IN ('alfazy', 'hit_and_blow', 'integra');
