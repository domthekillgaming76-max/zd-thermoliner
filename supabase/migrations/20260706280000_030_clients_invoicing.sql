-- 030 — Clients & Invoicing module (additive, extends existing clients from 029)

-- ── Extend clients ─────────────────────────────────────────────────────────────
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS siret text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_terms integer DEFAULT 30;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_routes text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_cargo text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_revenue numeric(14,2) DEFAULT 0;

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check
  CHECK (status IN ('active', 'inactive', 'prospect', 'suspended'));

-- ── client_contacts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  role text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON public.client_contacts(client_id);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_contacts_all" ON public.client_contacts;
CREATE POLICY "client_contacts_all" ON public.client_contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── transport_contracts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transport_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_number text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  price_per_km numeric(10,4) DEFAULT 0,
  minimum_monthly_volume integer DEFAULT 0,
  cargo_type text,
  temperature_required boolean DEFAULT false,
  payment_delay integer DEFAULT 30,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_contracts_client ON public.transport_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_transport_contracts_end ON public.transport_contracts(end_date);

ALTER TABLE public.transport_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transport_contracts_all" ON public.transport_contracts;
CREATE POLICY "transport_contracts_all" ON public.transport_contracts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── invoices ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  invoice_number text,
  road_sheet_id uuid REFERENCES public.road_sheets(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES public.transport_missions(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.transport_contracts(id) ON DELETE SET NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  amount_ht numeric(12,2) NOT NULL DEFAULT 0,
  vat_rate numeric(5,2) DEFAULT 20,
  vat_amount numeric(12,2) DEFAULT 0,
  amount_ttc numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'draft'
    CHECK (payment_status IN ('draft', 'sent', 'paid', 'late', 'cancelled')),
  paid_at timestamptz,
  transaction_id uuid,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON public.invoices(due_date);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_all" ON public.invoices;
CREATE POLICY "invoices_all" ON public.invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── invoice_lines ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(12,2) DEFAULT 0,
  amount_ht numeric(12,2) DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);

ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_lines_all" ON public.invoice_lines;
CREATE POLICY "invoice_lines_all" ON public.invoice_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── payment_reminders ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  reminder_date date NOT NULL,
  sent boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice ON public.payment_reminders(invoice_id);

ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_reminders_all" ON public.payment_reminders;
CREATE POLICY "payment_reminders_all" ON public.payment_reminders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Auto invoice number ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'FAC-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_number ON public.invoices;
CREATE TRIGGER trg_invoices_number
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();

CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := 'CTR-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_number ON public.transport_contracts;
CREATE TRIGGER trg_contracts_number
  BEFORE INSERT OR UPDATE ON public.transport_contracts
  FOR EACH ROW EXECUTE FUNCTION public.generate_contract_number();

COMMENT ON TABLE public.invoices IS 'Client invoices for Z&D Thermoliner ERP';
