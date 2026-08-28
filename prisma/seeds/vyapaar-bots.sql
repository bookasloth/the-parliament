-- Vyapaar computer players. Bots are backed by real User rows because
-- VyapaarRoomMember.userId / VyapaarMatchPlayer.userId are required FKs. The ids MUST match
-- BOT_USERS in src/modules/vyapaar/bot.ts (that's how a seat is detected as a bot).
-- UPSERT so re-running (or an earlier 5-bot version) is corrected in place.
INSERT INTO users (id, email, username, legal_name, display_name, member_type, vyapaar_wallet, vyapaar_granted, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000b1', 'bot_abuddhi@bots.nnawca.internal', 'bot_abuddhi', 'A Buddhi',      'A Buddhi',      'bot', 200000, true, now()),
  ('00000000-0000-4000-8000-0000000000b2', 'bot_vflash@bots.nnawca.internal',  'bot_vflash',  'V Flash',       'V Flash',       'bot', 200000, true, now()),
  ('00000000-0000-4000-8000-0000000000b3', 'bot_dkboss@bots.nnawca.internal',  'bot_dkboss',  'DK Boss',       'DK Boss',       'bot', 100000, true, now()),
  ('00000000-0000-4000-8000-0000000000b4', 'bot_chimlig@bots.nnawca.internal', 'bot_chimlig', 'Chimli G',      'Chimli G',      'bot', 100000, true, now()),
  ('00000000-0000-4000-8000-0000000000b5', 'bot_pkaddoo@bots.nnawca.internal', 'bot_pkaddoo', 'P Kaddoo',      'P Kaddoo',      'bot', 150000, true, now()),
  ('00000000-0000-4000-8000-0000000000b6', 'bot_dhamma@bots.nnawca.internal',  'bot_dhamma',  'Little Dhamma', 'Little Dhamma', 'bot', 150000, true, now())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, username = EXCLUDED.username, legal_name = EXCLUDED.legal_name,
  display_name = EXCLUDED.display_name, member_type = EXCLUDED.member_type,
  vyapaar_wallet = EXCLUDED.vyapaar_wallet, vyapaar_granted = EXCLUDED.vyapaar_granted, updated_at = now();
