-- Add financial fields to technical_assistance table
ALTER TABLE public.technical_assistance
ADD COLUMN cost_value numeric DEFAULT NULL,
ADD COLUMN sale_value numeric DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.technical_assistance.cost_value IS 'Valor de custo da assistência técnica';
COMMENT ON COLUMN public.technical_assistance.sale_value IS 'Valor de venda da assistência técnica';
COMMENT ON COLUMN public.technical_assistance.generated_revenue IS 'Indica se a AT gerou entrada financeira (true quando sale_value > 0)';