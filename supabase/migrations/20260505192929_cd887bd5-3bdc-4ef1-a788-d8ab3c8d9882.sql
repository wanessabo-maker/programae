ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS planner_status_at TIMESTAMPTZ;

UPDATE public.projects 
SET planner_status_at = COALESCE(updated_at, created_at, now())
WHERE planner_status IS NOT NULL AND planner_status_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_planner_status_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.planner_status IS NOT NULL) THEN
    NEW.planner_status_at = now();
  ELSIF (TG_OP = 'UPDATE' AND NEW.planner_status IS DISTINCT FROM OLD.planner_status) THEN
    NEW.planner_status_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planner_status_at ON public.projects;
CREATE TRIGGER trg_planner_status_at
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_planner_status_at();