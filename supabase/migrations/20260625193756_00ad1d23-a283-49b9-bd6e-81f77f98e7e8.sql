
CREATE TABLE public.planner_start_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by_user_id uuid NOT NULL,
  requested_by_team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by_user_id uuid,
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_planner_start_approvals_status ON public.planner_start_approvals(status);
CREATE INDEX idx_planner_start_approvals_project ON public.planner_start_approvals(project_id);
CREATE UNIQUE INDEX uq_planner_start_approvals_pending
  ON public.planner_start_approvals(project_id) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.planner_start_approvals TO authenticated;
GRANT ALL ON public.planner_start_approvals TO service_role;

ALTER TABLE public.planner_start_approvals ENABLE ROW LEVEL SECURITY;

-- SELECT: requester or admin in Comercial area
CREATE POLICY "psa_select_requester_or_comercial_admin"
  ON public.planner_start_approvals
  FOR SELECT TO authenticated
  USING (
    requested_by_user_id = auth.uid()
    OR (public.has_role(auth.uid(), 'admin') AND public.user_has_position_area(auth.uid(), 'comercial'))
  );

-- INSERT: must request as self
CREATE POLICY "psa_insert_self"
  ON public.planner_start_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by_user_id = auth.uid()
    AND status = 'pending'
  );

-- UPDATE: only admin in Comercial area (Gerência Comercial)
CREATE POLICY "psa_update_comercial_admin"
  ON public.planner_start_approvals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.user_has_position_area(auth.uid(), 'comercial'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.user_has_position_area(auth.uid(), 'comercial'));

CREATE TRIGGER update_planner_start_approvals_updated_at
  BEFORE UPDATE ON public.planner_start_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- On approval, move project AGUARDANDO_INICIO -> INICIADO
CREATE OR REPLACE FUNCTION public.fn_apply_planner_start_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    NEW.decided_by_user_id := COALESCE(NEW.decided_by_user_id, auth.uid());
    NEW.decided_at := COALESCE(NEW.decided_at, NOW());
    UPDATE public.projects
       SET planner_status = 'INICIADO',
           planner_data_iniciado = COALESCE(planner_data_iniciado, NOW()),
           planner_status_at = NOW()
     WHERE id = NEW.project_id
       AND planner_status = 'AGUARDANDO_INICIO';
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    NEW.decided_by_user_id := COALESCE(NEW.decided_by_user_id, auth.uid());
    NEW.decided_at := COALESCE(NEW.decided_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_planner_start_approval
  BEFORE UPDATE ON public.planner_start_approvals
  FOR EACH ROW EXECUTE FUNCTION public.fn_apply_planner_start_approval();
