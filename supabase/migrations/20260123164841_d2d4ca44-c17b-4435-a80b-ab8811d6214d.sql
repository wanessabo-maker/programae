-- Create table for tracking presented value history
CREATE TABLE public.project_value_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  presented_value NUMERIC NOT NULL,
  action_id UUID REFERENCES public.actions(id) ON DELETE SET NULL,
  consultant_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_value_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read project value history"
ON public.project_value_history
FOR SELECT
USING (is_authenticated());

CREATE POLICY "Authenticated users can insert project value history"
ON public.project_value_history
FOR INSERT
WITH CHECK (is_authenticated());

CREATE POLICY "Authenticated users can delete project value history"
ON public.project_value_history
FOR DELETE
USING (is_authenticated());

-- Create index for faster lookups
CREATE INDEX idx_project_value_history_project_id ON public.project_value_history(project_id);
CREATE INDEX idx_project_value_history_created_at ON public.project_value_history(created_at DESC);