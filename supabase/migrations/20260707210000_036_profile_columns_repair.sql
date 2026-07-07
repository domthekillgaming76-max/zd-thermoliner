-- 036 — Repair profile columns required by DOM76 guard & lifecycle (additive)

-- Migration 016 dropped these; migration 031 trigger still references them.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS application_status text DEFAULT 'approved';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;
UPDATE public.profiles SET application_status = COALESCE(application_status, 'approved');
UPDATE public.profiles SET is_suspended = false WHERE is_suspended IS NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_application_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_application_status_check
  CHECK (
    application_status IS NULL OR application_status IN (
      'none', 'pending', 'approved', 'rejected', 'left', 'fired', 'banned'
    )
  );

-- Safer DOM76 guard — only mutate fields that exist on the row
CREATE OR REPLACE FUNCTION public.guard_dom76_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_dom76_owner(OLD.email) THEN
    IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role NOT IN ('pdg', 'patron', 'admin') THEN
      NEW.role := OLD.role;
    END IF;
    NEW.is_active := true;
    NEW.is_suspended := false;
    IF NEW.application_status IN ('banned', 'fired', 'left') THEN
      NEW.application_status := COALESCE(OLD.application_status, 'approved');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.is_active IS 'False when member banned or departed';
COMMENT ON COLUMN public.profiles.application_status IS 'Recruitment / lifecycle status';
