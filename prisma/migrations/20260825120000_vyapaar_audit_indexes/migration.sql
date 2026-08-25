-- Vyapaar audit fixes H1 + M2: index the two hot lookups that currently seq-scan.
-- H1: "already in a game?" check filters vyapaar_match_player by user_id alone
--     (startMatch + topUpVyapaarCoins) — no user_id-prefixed index existed.
-- M2: the 10s turn-timer cron filters vyapaar_match by (status, turn_expires_at).
CREATE INDEX "vyapaar_match_player_user_id_idx" ON "vyapaar_match_player"("user_id");
CREATE INDEX "vyapaar_match_status_turn_expires_at_idx" ON "vyapaar_match"("status", "turn_expires_at");
