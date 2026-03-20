
-- Change requires_value from boolean to text with value type options
-- 'nenhum' = no value required, 'financeiro' = R$, 'quantitativo' = units
ALTER TABLE public.action_types 
  ALTER COLUMN requires_value TYPE text USING 
    CASE WHEN requires_value = true THEN 'financeiro' ELSE 'nenhum' END;

ALTER TABLE public.action_types 
  ALTER COLUMN requires_value SET DEFAULT 'nenhum';
