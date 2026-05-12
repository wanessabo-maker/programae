ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS origin_action_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_projects_origin_action_id
  ON public.projects(origin_action_id);

COMMENT ON COLUMN public.projects.origin_action_id IS
  'Ação de Captação (actions.id) que originou este projeto no Pipeline de Apresentações.';