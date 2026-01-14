-- Add last_action_type_id column to professionals table
ALTER TABLE public.professionals 
ADD COLUMN last_action_type_id uuid REFERENCES public.action_types(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_professionals_last_action_type ON public.professionals(last_action_type_id);