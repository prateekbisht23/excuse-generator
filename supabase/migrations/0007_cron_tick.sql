-- Production scheduler: pg_cron calls the app's tick endpoint every minute via pg_net.
-- The tick also queries the database, which keeps the free project from pausing.
-- Before running this, store the secret once (same value as CRON_SECRET in Vercel):
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('excuse-tick') where exists (select 1 from cron.job where jobname = 'excuse-tick');
select cron.schedule(
  'excuse-tick',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://excuses.bishh.dev/api/cron/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);
