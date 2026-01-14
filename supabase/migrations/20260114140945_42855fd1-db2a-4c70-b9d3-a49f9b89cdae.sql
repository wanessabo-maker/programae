-- Add category_id column to goals table for category-based metas
ALTER TABLE public.goals 
ADD COLUMN category_id uuid REFERENCES public.professional_categories(id) ON DELETE SET NULL;