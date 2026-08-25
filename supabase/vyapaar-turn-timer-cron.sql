-- Vyapaar turn-timer: every ~10s, ping the auto-resolve route to advance any turn
-- past its 30s deadline. Substitute <AUTH_URL> (prod app origin) and <CRON_SECRET>
-- (the same value as the Vercel CRON_SECRET env). Run once on the prod DB.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'vyapaar-turn-timeouts',
  '10 seconds',
  $$
  select net.http_post(
    url := '<AUTH_URL>/api/vyapaar/cron/timeouts',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);
-- To remove: select cron.unschedule('vyapaar-turn-timeouts');
