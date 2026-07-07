-- 027 — Professional Driver Management (additive extensions)

-- ── Extend drivers ────────────────────────────────────────────────────────────
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS discord_name text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS truckersmp_id text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS steam_id text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS employee_number text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS hiring_date date;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS license_expires_at date;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS eco_driving_score numeric(5,2) DEFAULT 0;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS rest_hours_month numeric(8,2) DEFAULT 0;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS presence_status text DEFAULT 'offline';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS member_role text DEFAULT 'chauffeur';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS driver_rating numeric(3,2) DEFAULT 0;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS fleet_name text DEFAULT 'Z&D Thermoliner';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Relax driving_status constraint for vacation alias
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_driving_status_check;
ALTER TABLE public.drivers ADD CONSTRAINT drivers_driving_status_check
  CHECK (driving_status IN ('driving', 'resting', 'vacation', 'sick', 'rest'));

ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_presence_status_check;
ALTER TABLE public.drivers ADD CONSTRAINT drivers_presence_status_check
  CHECK (presence_status IN ('online', 'offline', 'driving', 'rest', 'vacation'));

ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_employment_contract_check;
ALTER TABLE public.drivers ADD CONSTRAINT drivers_employment_contract_check
  CHECK (employment_contract IN ('CDI', 'CDD', 'Freelancer', 'freelance', 'cdi', 'cdd'));

ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_member_role_check;
ALTER TABLE public.drivers ADD CONSTRAINT drivers_member_role_check
  CHECK (member_role IN (
    'visitor', 'visiteur', 'candidat', 'recruitment', 'chauffeur', 'driver',
    'dispatcher', 'directeur', 'manager', 'patron', 'pdg', 'admin', 'hr'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_employee_number ON public.drivers(employee_number) WHERE employee_number IS NOT NULL;

-- ── driver_assignments (alias view over history) ──────────────────────────────
CREATE OR REPLACE VIEW public.driver_assignments AS
SELECT
  id,
  driver_id,
  asset_type,
  asset_id,
  asset_label,
  assigned_at,
  unassigned_at,
  CASE WHEN unassigned_at IS NULL THEN 'active' ELSE 'ended' END AS status
FROM public.driver_assignment_history;

GRANT SELECT ON public.driver_assignments TO authenticated;

-- ── Extend driver_documents ─────────────────────────────────────────────────
ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;
ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.driver_documents DROP CONSTRAINT IF EXISTS driver_documents_doc_type_check;
ALTER TABLE public.driver_documents ADD CONSTRAINT driver_documents_doc_type_check
  CHECK (doc_type IN ('license', 'medical', 'adr', 'identity', 'contract', 'insurance', 'other'));

ALTER TABLE public.driver_documents DROP CONSTRAINT IF EXISTS driver_documents_status_check;
ALTER TABLE public.driver_documents ADD CONSTRAINT driver_documents_status_check
  CHECK (status IN ('pending', 'valid', 'expired', 'rejected'));

-- ── Extend driver_salary_history ──────────────────────────────────────────────
ALTER TABLE public.driver_salary_history ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.driver_salary_history ADD COLUMN IF NOT EXISTS payment_date date;

ALTER TABLE public.driver_salary_history DROP CONSTRAINT IF EXISTS driver_salary_history_payment_status_check;
ALTER TABLE public.driver_salary_history ADD CONSTRAINT driver_salary_history_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'cancelled'));

-- ── Extend driver_incidents ───────────────────────────────────────────────────
ALTER TABLE public.driver_incidents ADD COLUMN IF NOT EXISTS incident_type text DEFAULT 'note';

ALTER TABLE public.driver_incidents DROP CONSTRAINT IF EXISTS driver_incidents_incident_type_check;
ALTER TABLE public.driver_incidents ADD CONSTRAINT driver_incidents_incident_type_check
  CHECK (incident_type IN ('accident', 'fine', 'late_delivery', 'damage', 'positive_feedback', 'manager_note', 'note'));

-- ── Admin-only driver management RPCs ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_driver_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role IN ('pdg', 'patron', 'admin', 'directeur')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_driver_admin(uuid) TO authenticated;

COMMENT ON VIEW public.driver_assignments IS 'Active and historical truck/trailer assignments for drivers';
