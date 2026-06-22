-- Add sales_channel to actions and goals so vendas/meta can be split between
-- "convencional" (Consultor Comercial) and "engenharia" (Consultor Comercial Engenharia).
ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS sales_channel text
  CHECK (sales_channel IS NULL OR sales_channel IN ('convencional','engenharia'));

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS sales_channel text
  CHECK (sales_channel IS NULL OR sales_channel IN ('convencional','engenharia'));

COMMENT ON COLUMN public.actions.sales_channel IS 'Canal de venda: convencional ou engenharia. Preenchido em vendas quando o consultor possui os dois cargos.';
COMMENT ON COLUMN public.goals.sales_channel IS 'Canal da meta de vendas: convencional, engenharia ou NULL (geral/auto-inferida).';