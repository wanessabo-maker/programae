ALTER TABLE public.checklist_templates
  ADD COLUMN IF NOT EXISTS points_per_environment integer DEFAULT 0;

UPDATE public.checklist_templates
SET points_per_environment = 5
WHERE step_order IN (10, 12) AND responsible_area = 'projetista_tecnico';

UPDATE public.checklist_templates
SET points_per_environment = 3
WHERE step_order = 11 AND responsible_area = 'projetista_tecnico';

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS checklist_item_id uuid REFERENCES public.checklist_items(id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_checklist_item
  ON public.credit_transactions(checklist_item_id)
  WHERE checklist_item_id IS NOT NULL;