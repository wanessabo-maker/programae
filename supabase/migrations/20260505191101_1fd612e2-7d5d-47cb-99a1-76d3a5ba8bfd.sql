
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS planner_observacao text,
  ADD COLUMN IF NOT EXISTS planner_link text,
  ADD COLUMN IF NOT EXISTS planner_motivo_perda text;
