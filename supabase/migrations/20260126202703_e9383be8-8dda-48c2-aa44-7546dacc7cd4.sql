-- =====================================================
-- CHECKLIST SYSTEM FOR CONTRACTS
-- =====================================================

-- 1. Create enum for contract checklist status
DO $$ BEGIN
  CREATE TYPE contract_workflow_status AS ENUM (
    'formalizacao',
    'desenvolvimento_tecnico',
    'aprovacao_comercial',
    'implantacao_tecnica',
    'logistica_entrega',
    'encerramento_cs',
    'encerrado'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Create checklist template table (defines the master checklist structure)
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_order integer NOT NULL,
  name text NOT NULL,
  responsible_area text NOT NULL, -- 'comercial', 'projetista_tecnico', 'logistica', 'cs'
  default_sla_days integer DEFAULT NULL, -- SLA in days, configurable in Setup
  workflow_status contract_workflow_status NOT NULL, -- Which status this step belongs to
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Create contract checklists table (instance of checklist for each contract)
CREATE TABLE IF NOT EXISTS public.contract_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workflow_status contract_workflow_status DEFAULT 'formalizacao',
  current_step integer DEFAULT 1,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(project_id)
);

-- 4. Create checklist items table (individual items for each contract)
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id uuid NOT NULL REFERENCES public.contract_checklists(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id),
  step_order integer NOT NULL,
  name text NOT NULL,
  responsible_area text NOT NULL,
  status text DEFAULT 'blocked' CHECK (status IN ('blocked', 'active', 'completed')),
  due_date date,
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES public.team_members(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Create checklist item attachments table
CREATE TABLE IF NOT EXISTS public.checklist_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid REFERENCES public.team_members(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Create checklist history table (audit trail)
CREATE TABLE IF NOT EXISTS public.checklist_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'completed', 'note_added', 'attachment_added'
  performed_by uuid REFERENCES public.team_members(id),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Insert default checklist template
INSERT INTO public.checklist_templates (step_order, name, responsible_area, workflow_status, default_sla_days) VALUES
  (1, 'Pedido no FOCCO', 'comercial', 'formalizacao', 1),
  (2, 'Contrato assinado e salvo', 'comercial', 'formalizacao', 2),
  (3, 'Entrada registrada e comprovante enviado', 'comercial', 'formalizacao', 1),
  (4, 'E-mail formal enviado ao Cliente', 'comercial', 'formalizacao', 1),
  (5, 'RT solicitada ao Financeiro (se houver)', 'comercial', 'formalizacao', 2),
  (6, 'Grupo criado (WhatsApp)', 'comercial', 'formalizacao', 1),
  (7, 'Grupo criado (Teams)', 'comercial', 'formalizacao', 1),
  (8, 'Medição agendada', 'comercial', 'formalizacao', 3),
  (9, 'Briefing Técnico inserido na pasta', 'comercial', 'formalizacao', 2),
  (10, 'Caderno técnico concluído', 'projetista_tecnico', 'desenvolvimento_tecnico', 5),
  (11, 'Caderno Técnico aprovado', 'comercial', 'aprovacao_comercial', 2),
  (12, 'Pedido implantado', 'projetista_tecnico', 'implantacao_tecnica', 3),
  (13, 'Planilha atualizada', 'projetista_tecnico', 'implantacao_tecnica', 1),
  (14, 'Pedido em Goiânia', 'logistica', 'logistica_entrega', 5),
  (15, 'Entrega agendada', 'logistica', 'logistica_entrega', 3),
  (16, 'Pedido entregue', 'logistica', 'logistica_entrega', 5),
  (17, 'Certificado de garantia assinado e na pasta', 'comercial', 'encerramento_cs', 2),
  (18, 'Encerramento Final da Venda – Ciclos concluídos', 'cs', 'encerramento_cs', 5)
ON CONFLICT DO NOTHING;

-- 8. Enable RLS
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_history ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for checklist_templates (read all, admin modify)
CREATE POLICY "Authenticated users can read checklist_templates" 
  ON public.checklist_templates FOR SELECT 
  USING (is_authenticated());

CREATE POLICY "Admins can manage checklist_templates" 
  ON public.checklist_templates FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 10. RLS Policies for contract_checklists
CREATE POLICY "Authenticated users can read contract_checklists" 
  ON public.contract_checklists FOR SELECT 
  USING (is_authenticated());

CREATE POLICY "Authenticated users can insert contract_checklists" 
  ON public.contract_checklists FOR INSERT 
  WITH CHECK (is_authenticated());

CREATE POLICY "Authenticated users can update contract_checklists" 
  ON public.contract_checklists FOR UPDATE 
  USING (is_authenticated());

-- 11. RLS Policies for checklist_items
CREATE POLICY "Authenticated users can read checklist_items" 
  ON public.checklist_items FOR SELECT 
  USING (is_authenticated());

CREATE POLICY "Authenticated users can update checklist_items" 
  ON public.checklist_items FOR UPDATE 
  USING (is_authenticated());

CREATE POLICY "Authenticated users can insert checklist_items" 
  ON public.checklist_items FOR INSERT 
  WITH CHECK (is_authenticated());

-- 12. RLS Policies for checklist_attachments
CREATE POLICY "Authenticated users can read checklist_attachments" 
  ON public.checklist_attachments FOR SELECT 
  USING (is_authenticated());

CREATE POLICY "Authenticated users can insert checklist_attachments" 
  ON public.checklist_attachments FOR INSERT 
  WITH CHECK (is_authenticated());

CREATE POLICY "Authenticated users can delete own attachments" 
  ON public.checklist_attachments FOR DELETE 
  USING (uploaded_by = get_current_team_member_id() OR has_role(auth.uid(), 'admin'::app_role));

-- 13. RLS Policies for checklist_history
CREATE POLICY "Authenticated users can read checklist_history" 
  ON public.checklist_history FOR SELECT 
  USING (is_authenticated());

CREATE POLICY "Authenticated users can insert checklist_history" 
  ON public.checklist_history FOR INSERT 
  WITH CHECK (is_authenticated());

-- 14. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_status ON public.checklist_items(status);
CREATE INDEX IF NOT EXISTS idx_checklist_items_responsible ON public.checklist_items(responsible_area);
CREATE INDEX IF NOT EXISTS idx_contract_checklists_project ON public.contract_checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_checklist_history_item ON public.checklist_history(checklist_item_id);

-- 15. Add trigger to update updated_at
CREATE TRIGGER update_contract_checklists_updated_at
  BEFORE UPDATE ON public.contract_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();