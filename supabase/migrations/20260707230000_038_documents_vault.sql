-- 038 — Documents & Digital Vault (additive)

-- ── Categories ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  owner_type text NOT NULL DEFAULT 'company'
    CHECK (owner_type IN ('driver', 'truck', 'trailer', 'company', 'client')),
  is_required boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.document_categories (key, label, owner_type, is_required, sort_order) VALUES
  ('driver_license', 'Permis de conduire', 'driver', true, 10),
  ('adr_certificate', 'Certificat ADR', 'driver', false, 20),
  ('medical_certificate', 'Certificat médical', 'driver', true, 30),
  ('employment_contract', 'Contrat de travail', 'driver', true, 40),
  ('identity_document', 'Pièce d''identité', 'driver', true, 50),
  ('truck_insurance', 'Assurance camion', 'truck', true, 60),
  ('truck_registration', 'Carte grise camion', 'truck', true, 70),
  ('technical_inspection', 'Contrôle technique', 'truck', true, 80),
  ('trailer_documents', 'Documents remorque', 'trailer', true, 90),
  ('bank_documents', 'Documents bancaires', 'company', false, 100),
  ('invoices', 'Factures', 'client', false, 110),
  ('contracts', 'Contrats', 'company', false, 120),
  ('recruitment_files', 'Dossiers recrutement', 'company', false, 130)
ON CONFLICT (key) DO NOTHING;

-- ── Documents ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.document_categories(id) ON DELETE SET NULL,
  category_key text NOT NULL,
  title text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  owner_type text NOT NULL
    CHECK (owner_type IN ('driver', 'truck', 'trailer', 'company', 'client')),
  owner_id uuid,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  notes text,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category_key);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_expires ON public.documents(expires_at);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);

-- ── Audit logs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.document_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL
    CHECK (action IN ('upload', 'download', 'delete', 'replace', 'approve', 'reject', 'view', 'preview')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_audit_document ON public.document_audit_logs(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_audit_user ON public.document_audit_logs(user_id, created_at DESC);

-- ── Reminders ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.document_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  owner_type text NOT NULL,
  owner_id uuid,
  category_key text,
  reminder_type text NOT NULL
    CHECK (reminder_type IN ('expiring_30', 'expiring_7', 'expired', 'missing_required')),
  message text,
  sent_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_reminders_type ON public.document_reminders(reminder_type, created_at DESC);

-- ── Helpers ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_driver_role_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role IN ('chauffeur', 'tractionnaire')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_driver_role_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_owns_document_owner(
  p_owner_type text,
  p_owner_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_owner_type = 'driver' AND p_owner_id IS NOT NULL THEN
      EXISTS (SELECT 1 FROM public.drivers WHERE id = p_owner_id AND user_id = p_user_id)
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_document_owner(text, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_can_access_document_row(
  p_owner_type text,
  p_owner_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_erp_admin(p_user_id)
    OR NOT public.is_driver_role_user(p_user_id)
    OR public.user_owns_document_owner(p_owner_type, p_owner_id, p_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_document_row(text, uuid, uuid) TO authenticated;

-- ── Storage bucket (private) ──────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- ── RLS: documents ────────────────────────────────────────────────────────────

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_categories_select" ON public.document_categories;
CREATE POLICY "document_categories_select" ON public.document_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT TO authenticated
  USING (public.user_can_access_document_row(owner_type, owner_id, auth.uid()));

DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      public.is_erp_admin(auth.uid())
      OR NOT public.is_driver_role_user(auth.uid())
      OR public.user_owns_document_owner(owner_type, owner_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "documents_update" ON public.documents;
CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    public.is_erp_admin(auth.uid())
    OR uploaded_by = auth.uid()
    OR public.user_owns_document_owner(owner_type, owner_id, auth.uid())
  )
  WITH CHECK (
    public.is_erp_admin(auth.uid())
    OR status IN ('pending', 'expired')
  );

DROP POLICY IF EXISTS "documents_delete" ON public.documents;
CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE TO authenticated
  USING (
    public.is_erp_admin(auth.uid())
    OR uploaded_by = auth.uid()
    OR public.user_owns_document_owner(owner_type, owner_id, auth.uid())
  );

-- ── RLS: audit logs ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "document_audit_logs_select" ON public.document_audit_logs;
CREATE POLICY "document_audit_logs_select" ON public.document_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_erp_admin(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "document_audit_logs_insert" ON public.document_audit_logs;
CREATE POLICY "document_audit_logs_insert" ON public.document_audit_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ── RLS: reminders ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "document_reminders_select" ON public.document_reminders;
CREATE POLICY "document_reminders_select" ON public.document_reminders
  FOR SELECT TO authenticated
  USING (
    public.is_erp_admin(auth.uid())
    OR public.user_owns_document_owner(owner_type, owner_id, auth.uid())
    OR NOT public.is_driver_role_user(auth.uid())
  );

DROP POLICY IF EXISTS "document_reminders_insert" ON public.document_reminders;
CREATE POLICY "document_reminders_insert" ON public.document_reminders
  FOR INSERT TO authenticated WITH CHECK (public.is_erp_admin(auth.uid()));

-- ── Storage policies ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
CREATE POLICY "documents_storage_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
CREATE POLICY "documents_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_storage_update" ON storage.objects;
CREATE POLICY "documents_storage_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;
CREATE POLICY "documents_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (public.is_erp_admin(auth.uid()) OR owner = auth.uid()));

COMMENT ON TABLE public.documents IS 'Central digital vault documents';
COMMENT ON TABLE public.document_categories IS 'Document category catalog';
COMMENT ON TABLE public.document_audit_logs IS 'Audit trail for vault actions';
COMMENT ON TABLE public.document_reminders IS 'Expiration and missing document reminders';
