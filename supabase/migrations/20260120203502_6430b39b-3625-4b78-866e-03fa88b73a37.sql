-- Add field to track manual category adjustments
ALTER TABLE public.professionals 
ADD COLUMN is_manual_category boolean DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.professionals.is_manual_category IS 'Indicates if the category was manually set by an admin, preventing automatic category updates';