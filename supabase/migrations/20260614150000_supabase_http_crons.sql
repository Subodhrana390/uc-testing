-- Ensure pg_cron and pg_net extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Safely unschedule existing jobs if they exist to avoid duplicate scheduling
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue') THEN
    PERFORM cron.unschedule('process-email-queue');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-order-queue') THEN
    PERFORM cron.unschedule('process-order-queue');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconciliation') THEN
    PERFORM cron.unschedule('reconciliation');
  END IF;
END $$;

-- Schedule process-email-queue to run every 5 minutes
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *',
  $$ SELECT net.http_get(url := 'https://uc-enterprises.vercel.app/api/cron/process-email-queue'); $$
);

-- Schedule process-order-queue to run every 5 minutes
SELECT cron.schedule(
  'process-order-queue',
  '*/5 * * * *',
  $$ SELECT net.http_get(url := 'https://uc-enterprises.vercel.app/api/cron/process-order-queue'); $$
);

-- Schedule reconciliation to run daily at midnight
SELECT cron.schedule(
  'reconciliation',
  '0 0 * * *',
  $$ SELECT net.http_get(url := 'https://uc-enterprises.vercel.app/api/cron/reconciliation'); $$
);
