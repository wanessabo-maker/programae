-- Add field to track who attended the technical assistance visit
ALTER TABLE public.technical_assistance 
ADD COLUMN IF NOT EXISTS attended_by uuid REFERENCES public.team_members(id);

-- Add comment
COMMENT ON COLUMN public.technical_assistance.attended_by IS 'The team member who attended/performed the technical visit';