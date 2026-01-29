-- Add area_id column to action_types table
ALTER TABLE public.action_types 
ADD COLUMN area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_action_types_area_id ON public.action_types(area_id);