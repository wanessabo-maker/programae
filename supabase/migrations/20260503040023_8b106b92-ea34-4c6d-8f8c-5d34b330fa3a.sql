ALTER TABLE public.checklist_items DROP CONSTRAINT IF EXISTS checklist_items_status_check;
ALTER TABLE public.checklist_items ADD CONSTRAINT checklist_items_status_check CHECK (status IN ('blocked','active','completed','skipped'));
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_items' AND column_name='assigned_to') THEN
    ALTER TABLE public.checklist_items ADD COLUMN assigned_to uuid REFERENCES public.team_members(id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_checklist_items_status ON public.checklist_items(status);
UPDATE public.checklist_templates SET name='Planilha de Controle de Pedidos atualizada' WHERE step_order=13 AND name='Planilha atualizada';