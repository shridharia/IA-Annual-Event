-- OPTIONAL scheduler that does NOT depend on your Vercel plan.
-- Vercel Hobby cron jobs can run at most once per day; per-minute schedules need Pro.
-- Supabase pg_cron + pg_net can call the same protected endpoint every minute on any plan.
-- Run in the Supabase SQL editor AFTER deploying. Replace the two placeholders. Do not commit real secrets.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'impact11-dispatch',
  '* * * * *',
  $$ select net.http_get(
       url     := 'https://YOUR-DOMAIN.vercel.app/api/cron/dispatch',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
       timeout_milliseconds := 55000
     ); $$
);
-- Remove later:  select cron.unschedule('impact11-dispatch');
