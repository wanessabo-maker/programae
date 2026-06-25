
CREATE OR REPLACE FUNCTION public.fn_guard_planner_start_approval_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Only guard transitions into a decision state
  IF NEW.status IN ('approved','rejected')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
    END IF;

    IF NOT (public.has_role(v_uid, 'admin'::app_role)
            AND public.user_has_position_area(v_uid, 'comercial'::functional_area)) THEN
      RAISE EXCEPTION 'Apenas administradores da Gerência Comercial podem aprovar ou recusar solicitações'
        USING ERRCODE = '42501';
    END IF;

    -- Force decision metadata to the acting user
    NEW.decided_by_user_id := v_uid;
    NEW.decided_at := COALESCE(NEW.decided_at, NOW());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_planner_start_approval_decision ON public.planner_start_approvals;
CREATE TRIGGER trg_guard_planner_start_approval_decision
BEFORE UPDATE ON public.planner_start_approvals
FOR EACH ROW
EXECUTE FUNCTION public.fn_guard_planner_start_approval_decision();
