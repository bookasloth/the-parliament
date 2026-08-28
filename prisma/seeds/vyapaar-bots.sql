-- Vyapaar computer players. Bots are backed by real User rows because
-- VyapaarRoomMember.userId / VyapaarMatchPlayer.userId are required FKs. The ids MUST match
-- BOT_USERS in src/modules/vyapaar/bot.ts (that's how a seat is detected as a bot). Idempotent.
INSERT INTO users (id, email, username, legal_name, display_name, member_type, vyapaar_wallet, vyapaar_granted, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000b1', 'bot_ravi@bots.nnawca.internal',  'bot_ravi',  'Ravi (bot)',  'Ravi (bot)',  'bot', 25000, true, now()),
  ('00000000-0000-4000-8000-0000000000b2', 'bot_meera@bots.nnawca.internal', 'bot_meera', 'Meera (bot)', 'Meera (bot)', 'bot', 25000, true, now()),
  ('00000000-0000-4000-8000-0000000000b3', 'bot_arjun@bots.nnawca.internal', 'bot_arjun', 'Arjun (bot)', 'Arjun (bot)', 'bot', 25000, true, now()),
  ('00000000-0000-4000-8000-0000000000b4', 'bot_sana@bots.nnawca.internal',  'bot_sana',  'Sana (bot)',  'Sana (bot)',  'bot', 25000, true, now()),
  ('00000000-0000-4000-8000-0000000000b5', 'bot_dev@bots.nnawca.internal',   'bot_dev',   'Dev (bot)',   'Dev (bot)',   'bot', 25000, true, now())
ON CONFLICT (id) DO NOTHING;
