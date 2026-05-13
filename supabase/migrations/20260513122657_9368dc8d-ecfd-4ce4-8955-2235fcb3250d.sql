CREATE TABLE IF NOT EXISTS public.project_deletion_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  project_name text,
  client_id uuid,
  client_name text,
  focco_project_number text,
  planner_status text,
  stage text,
  estimated_value numeric,
  origin_type text,
  created_by uuid,
  responsible_id uuid,
  project_created_at timestamptz,
  project_updated_at timestamptz,
  deleted_by_user_id uuid,
  deleted_by_team_member_id uuid,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  project_snapshot jsonb
);

ALTER TABLE public.project_deletion_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read project deletion audit"
  ON public.project_deletion_audit FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert project deletion audit"
  ON public.project_deletion_audit FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_project_deletion_audit_deleted_at
  ON public.project_deletion_audit (deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_deletion_audit_project_id
  ON public.project_deletion_audit (project_id);

CREATE OR REPLACE FUNCTION public.fn_audit_project_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
BEGIN
  SELECT name INTO v_client_name FROM clients WHERE id = OLD.client_id;

  INSERT INTO public.project_deletion_audit (
    project_id, project_name, client_id, client_name, focco_project_number,
    planner_status, stage, estimated_value, origin_type,
    created_by, responsible_id, project_created_at, project_updated_at,
    deleted_by_user_id, deleted_by_team_member_id, project_snapshot
  ) VALUES (
    OLD.id, OLD.name, OLD.client_id, v_client_name, OLD.focco_project_number,
    OLD.planner_status, OLD.stage, OLD.estimated_value, OLD.origin_type,
    OLD.created_by, OLD.responsible_id, OLD.created_at, OLD.updated_at,
    auth.uid(), get_current_team_member_id(), to_jsonb(OLD)
  );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_project_deletion ON public.projects;
CREATE TRIGGER trg_audit_project_deletion
  BEFORE DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_project_deletion();