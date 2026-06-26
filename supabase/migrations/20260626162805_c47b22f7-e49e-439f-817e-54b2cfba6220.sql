ALTER TABLE public.professional_categories
  ADD COLUMN IF NOT EXISTS min_percentage numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_percentage numeric DEFAULT NULL;

COMMENT ON COLUMN public.professional_categories.min_percentage IS 'Meta mínima (mais que X%) de profissionais nesta categoria';
COMMENT ON COLUMN public.professional_categories.max_percentage IS 'Meta máxima (até X%) de profissionais nesta categoria';