
CREATE OR REPLACE FUNCTION public.fn_guard_planner_start_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oldest_id uuid;
  v_has_approval boolean;
BEGIN
  -- Only guard the AGUARDANDO_INICIO -> INICIADO transition
  IF NEW.planner_status = 'INICIADO'
     AND OLD.planner_status = 'AGUARDANDO_INICIO' THEN

    -- Find the oldest card in the queue (FIFO: smallest planner_data_aguardando)
    SELECT id INTO v_oldest_id
      FROM public.projects
     WHERE planner_status = 'AGUARDANDO_INICIO'
       AND planner_data_aguardando IS NOT NULL
     ORDER BY planner_data_aguardando ASC NULLS LAST, created_at ASC
     LIMIT 1;

    -- If this is the oldest card, allow without approval
    IF v_oldest_id IS NOT NULL AND v_oldest_id = NEW.id THEN
      RETURN NEW;
    END IF;

    -- Otherwise, require an approved planner_start_approvals row
    SELECT EXISTS (
      SELECT 1
        FROM public.planner_start_approvals
       WHERE project_id = NEW.id
         AND status = 'approved'
    ) INTO v_has_approval;

    IF NOT v_has_approval THEN
      RAISE EXCEPTION 'Este projeto não é o mais antigo da fila. É necessária a aprovação da Gerência Comercial para iniciá-lo fora da ordem.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_planner_start_transition ON public.projects;
CREATE TRIGGER trg_guard_planner_start_transition
BEFORE UPDATE OF planner_status ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.fn_guard_planner_start_transition();
