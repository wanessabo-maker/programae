-- Add revenue generation field to technical_assistance table
ALTER TABLE public.technical_assistance
ADD COLUMN generated_revenue boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.technical_assistance.generated_revenue IS 'Indicates if the AT case generated revenue (Gerou Caixa)';