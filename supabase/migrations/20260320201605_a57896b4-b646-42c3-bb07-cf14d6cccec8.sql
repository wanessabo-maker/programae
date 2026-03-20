-- Rename 'quantitativo' to 'ambientes' in action_types
UPDATE public.action_types SET requires_value = 'ambientes' WHERE requires_value = 'quantitativo';
-- Update default comment: valid values are now 'nenhum', 'financeiro', 'ambientes'
COMMENT ON COLUMN public.action_types.requires_value IS 'nenhum | financeiro | ambientes';