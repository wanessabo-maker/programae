
-- Split apply trigger: keep BEFORE for decision metadata, move project update to AFTER
-- so the approved planner_start_approvals row is visible to the FIFO guard trigger
-- on projects (which does a SELECT EXISTS against planner_start_approvals).

CREATE OR REPLACE FUNCTION public.fn_apply_planner_start_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('approved','rejected') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.decided_by_user_id := COALESCE(NEW.decided_by_user_id, auth.uid());
    NEW.decided_at := COALESCE(NEW.decided_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_apply_planner_start_approval_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE public.projects
       SET planner_status = 'INICIADO',
           planner_data_iniciado = COALESCE(planner_data_iniciado, NOW()),
           planner_status_at = NOW()
     WHERE id = NEW.project_id
       AND planner_status = 'AGUARDANDO_INICIO';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_planner_start_approval_after ON public.planner_start_approvals;
CREATE TRIGGER trg_apply_planner_start_approval_after
AFTER UPDATE ON public.planner_start_approvals
FOR EACH ROW EXECUTE FUNCTION public.fn_apply_planner_start_approval_after();
