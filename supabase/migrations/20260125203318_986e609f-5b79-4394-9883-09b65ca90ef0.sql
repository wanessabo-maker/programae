-- Add origin_type field to projects table for traceability of exceptions
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS origin_type text DEFAULT 'standard';

-- Add comments to document the field
COMMENT ON COLUMN public.projects.origin_type IS 'Tracks how the project was created: standard (normal flow), venda_direta (sale without presentation), certificado_sem_venda (certificate without sale)';