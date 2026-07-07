-- 035 — ERP Reports & export logging (additive)

CREATE TABLE IF NOT EXISTS public.report_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  format text NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'json')),
  row_count integer NOT NULL DEFAULT 0,
  filters jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_exports_user ON public.report_exports(user_id, created_at DESC);

ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_exports_select" ON public.report_exports;
CREATE POLICY "report_exports_select" ON public.report_exports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_erp_admin(auth.uid()));

DROP POLICY IF EXISTS "report_exports_insert" ON public.report_exports;
CREATE POLICY "report_exports_insert" ON public.report_exports
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.report_exports IS 'Audit log of ERP report exports';
