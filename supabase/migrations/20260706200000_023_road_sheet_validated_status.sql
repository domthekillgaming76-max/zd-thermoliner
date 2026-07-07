-- Allow road_sheets.status = 'validated' for approval workflow

DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.road_sheets'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.road_sheets DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

ALTER TABLE public.road_sheets
  ADD CONSTRAINT road_sheets_status_check
  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'validated'));
