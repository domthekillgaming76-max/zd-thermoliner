-- 046 — Freight cron logging + dedup fingerprints (additive)

CREATE TABLE IF NOT EXISTS public.freight_cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_count int NOT NULL DEFAULT 0,
  chained_count int NOT NULL DEFAULT 0,
  archived_count int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]',
  duration_ms int NOT NULL DEFAULT 0,
  summary jsonb
);

CREATE INDEX IF NOT EXISTS idx_freight_cron_logs_executed ON public.freight_cron_logs(executed_at DESC);

ALTER TABLE public.freight_offers
  ADD COLUMN IF NOT EXISTS cron_fingerprint text;

ALTER TABLE public.freight_chains
  ADD COLUMN IF NOT EXISTS cron_fingerprint text;

CREATE INDEX IF NOT EXISTS idx_freight_offers_cron_fp
  ON public.freight_offers(cron_fingerprint)
  WHERE cron_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_freight_chains_cron_fp
  ON public.freight_chains(cron_fingerprint)
  WHERE cron_fingerprint IS NOT NULL;

ALTER TABLE public.freight_cron_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "freight_cron_logs_service" ON public.freight_cron_logs;
CREATE POLICY "freight_cron_logs_service" ON public.freight_cron_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.freight_cron_logs IS 'Execution logs for automated freight generation cron';
