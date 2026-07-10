
CREATE TABLE public.planner_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_status text,
  to_status text,
  moved_by_user_id uuid,
  moved_by_team_member_id uuid,
  moved_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_planner_status_history_project ON public.planner_status_history(project_id, created_at DESC);

GRANT SELECT ON public.planner_status_history TO authenticated;
GRANT ALL ON public.planner_status_history TO service_role;

ALTER TABLE public.planner_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view planner history"
  ON public.planner_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.fn_log_planner_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tm_id uuid;
  v_name text;
BEGIN
  IF NEW.planner_status IS DISTINCT FROM OLD.planner_status THEN
    v_tm_id := public.get_current_team_member_id();
    SELECT name INTO v_name FROM public.team_members WHERE id = v_tm_id;

    INSERT INTO public.planner_status_history(
      project_id, from_status, to_status,
      moved_by_user_id, moved_by_team_member_id, moved_by_name
    ) VALUES (
      NEW.id, OLD.planner_status, NEW.planner_status,
      auth.uid(), v_tm_id, v_name
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_planner_status_change ON public.projects;
CREATE TRIGGER trg_log_planner_status_change
  AFTER UPDATE OF planner_status ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_planner_status_change();
