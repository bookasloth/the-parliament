-- Seed the official NNAWCA bot / system account + the "announcement" post category.
-- Run once on prod (Supabase SQL editor). Idempotent: re-running is a no-op.
--
-- The bot is a normal users row with member_type = 'system'; app code resolves it
-- via getBotUserId() (src/modules/bot/service.ts). No password (login-less account).

-- 1. "announcement" post category for the (single) canonical school.
INSERT INTO post_categories (id, school_id, key, label, created_at)
SELECT gen_random_uuid(), s.id, 'announcement', 'Announcement', now()
FROM (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1) s
ON CONFLICT (school_id, key) DO NOTHING;

-- 2. The bot user, attached to that same school.
INSERT INTO users (
  id, school_id, email, username, legal_name, display_name,
  member_type, is_verified, verified_at, status,
  onboarding_step, onboarding_completed, profile_completion,
  membership_status, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1),
  'bot@nnawca.com', 'nnawca', 'NNAWCA', 'NNAWCA',
  'system', true, now(), 'active',
  'complete', true, 100,
  'committee', now(), now()
ON CONFLICT (email) DO NOTHING;

-- 3. Minimal profile so the bot renders in cards / feed.
INSERT INTO profiles (user_id, headline, visibility, is_complete, updated_at)
SELECT u.id, 'Official account of NNAWCA', 'alumni', true, now()
FROM users u
WHERE u.username = 'nnawca' AND u.member_type = 'system'
ON CONFLICT (user_id) DO NOTHING;
