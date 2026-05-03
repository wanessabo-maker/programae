-- Add 'delivered' stage and indexes for unified flow
DO $$ BEGIN
  ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_stage_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_stage_check
  CHECK (stage IN ('em_negociacao', 'closed_won', 'closed_lost', 'delivered'));

CREATE INDEX IF NOT EXISTS idx_projects_stage ON public.projects(stage);
CREATE INDEX IF NOT EXISTS idx_projects_actual_delivery ON public.projects(actual_delivery) WHERE actual_delivery IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cs_cases_project_id ON public.cs_cases(project_id) WHERE project_id IS NOT NULL;