-- Transactional-outbox drain (audit IP-5): every 15s, ping the drain route to
-- process due outbox events (ranking recompute, and future fan-out). This is the
-- PRIMARY trigger; vercel.json has a once-daily fallback only. Substitute
-- <AUTH_URL> (prod app origin) and <CRON_SECRET> (the Vercel CRON_SECRET env).
-- Run once on the prod DB. Mirrors supabase/vyapaar-turn-timer-cron.sql.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'outbox-drain',
  '15 seconds',
  $$
  select net.http_post(
    url := '<AUTH_URL>/api/cron/outbox',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);
-- To remove: select cron.unschedule('outbox-drain');
