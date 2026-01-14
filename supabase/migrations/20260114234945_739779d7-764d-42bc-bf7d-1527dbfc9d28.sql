-- Add credit validity settings to action_types table
ALTER TABLE public.action_types 
ADD COLUMN credit_validity_type text DEFAULT 'global',
ADD COLUMN credit_validity_days integer DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.action_types.credit_validity_type IS 'Credit validity type: global (uses system settings), mensal, anual, dias, personalizado, sem_validade';
COMMENT ON COLUMN public.action_types.credit_validity_days IS 'Number of days for credit validity when type is dias or personalizado';