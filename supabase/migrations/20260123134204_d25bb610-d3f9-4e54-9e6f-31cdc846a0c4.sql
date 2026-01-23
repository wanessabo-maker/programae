-- Add column to store which additional fields are enabled for each action type
-- Using JSONB array to store field names: ['clientName', 'clientAge', 'clientProfession', 'presentationNumber', 'foccoProjectNumber']
ALTER TABLE public.action_types 
ADD COLUMN IF NOT EXISTS enabled_fields TEXT[] DEFAULT '{}'::TEXT[];