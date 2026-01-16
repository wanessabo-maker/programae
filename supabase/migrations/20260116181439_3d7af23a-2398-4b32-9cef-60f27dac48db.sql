-- Add focco_project_number to projects table (unique constraint)
ALTER TABLE public.projects ADD COLUMN focco_project_number text UNIQUE;

-- Add project_id to actions table to link actions to projects
ALTER TABLE public.actions ADD COLUMN project_id uuid REFERENCES projects(id);

-- Create index for faster lookups
CREATE INDEX idx_projects_focco ON public.projects(focco_project_number) WHERE focco_project_number IS NOT NULL;
CREATE INDEX idx_actions_project_id ON public.actions(project_id) WHERE project_id IS NOT NULL;