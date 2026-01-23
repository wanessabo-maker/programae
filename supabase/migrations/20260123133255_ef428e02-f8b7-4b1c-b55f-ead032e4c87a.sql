-- =============================================
-- CUSTOMER SUCCESS (CS) & ASSISTÊNCIA TÉCNICA (AT) SCHEMA
-- =============================================

-- 1. CS Contact Schedules (Periodicidade configurável pelo Admin)
CREATE TABLE public.cs_contact_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  days_after_signature INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. CS Action Types (Tipos de ação de CS)
CREATE TABLE public.cs_action_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. AT Action Types (Tipos de ação reativa de AT)
CREATE TABLE public.at_action_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. CS Cases (Casos de CS vinculados a contratos)
CREATE TABLE public.cs_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL,
  signature_date DATE NOT NULL,
  responsible_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. CS Actions (Ações/visitas de CS - preventivas)
CREATE TABLE public.cs_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cs_case_id UUID NOT NULL REFERENCES public.cs_cases(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.cs_contact_schedules(id) ON DELETE SET NULL,
  action_type_id UUID REFERENCES public.cs_action_types(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  performed_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Update technical_assistance table with required dates
ALTER TABLE public.technical_assistance 
  ADD COLUMN IF NOT EXISTS contact_date DATE,
  ADD COLUMN IF NOT EXISTS visit_date DATE,
  ADD COLUMN IF NOT EXISTS solution_date DATE,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS action_type_id UUID REFERENCES public.at_action_types(id) ON DELETE SET NULL;

-- =============================================
-- RLS POLICIES
-- =============================================

-- CS Contact Schedules (Admin only write, all read)
ALTER TABLE public.cs_contact_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cs_contact_schedules"
  ON public.cs_contact_schedules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read cs_contact_schedules"
  ON public.cs_contact_schedules FOR SELECT
  USING (is_authenticated());

-- CS Action Types (Admin only write, all read)
ALTER TABLE public.cs_action_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cs_action_types"
  ON public.cs_action_types FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read cs_action_types"
  ON public.cs_action_types FOR SELECT
  USING (is_authenticated());

-- AT Action Types (Admin only write, all read)
ALTER TABLE public.at_action_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage at_action_types"
  ON public.at_action_types FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read at_action_types"
  ON public.at_action_types FOR SELECT
  USING (is_authenticated());

-- CS Cases (CS area users + Admin)
ALTER TABLE public.cs_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CS area users can manage cs_cases"
  ON public.cs_cases FOR ALL
  USING (user_has_area(auth.uid(), 'customer_success'::functional_area) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_has_area(auth.uid(), 'customer_success'::functional_area) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read cs_cases"
  ON public.cs_cases FOR SELECT
  USING (is_authenticated());

-- CS Actions (CS area users + Admin)
ALTER TABLE public.cs_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CS area users can manage cs_actions"
  ON public.cs_actions FOR ALL
  USING (user_has_area(auth.uid(), 'customer_success'::functional_area) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_has_area(auth.uid(), 'customer_success'::functional_area) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read cs_actions"
  ON public.cs_actions FOR SELECT
  USING (is_authenticated());

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_cs_cases_updated_at
  BEFORE UPDATE ON public.cs_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cs_actions_updated_at
  BEFORE UPDATE ON public.cs_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- DEFAULT DATA
-- =============================================

-- Default CS Contact Schedules
INSERT INTO public.cs_contact_schedules (name, days_after_signature, description, sort_order) VALUES
  ('Contato Inicial', 90, 'Primeiro contato após assinatura do certificado de garantia', 1),
  ('Segundo Contato', 180, 'Contato de acompanhamento semestral', 2),
  ('Contato Anual', 365, 'Contato anual de relacionamento', 3);

-- Default CS Action Types
INSERT INTO public.cs_action_types (name, description) VALUES
  ('Visita Presencial', 'Visita presencial ao cliente'),
  ('Contato Telefônico', 'Ligação telefônica de acompanhamento'),
  ('Contato por E-mail', 'Comunicação por e-mail'),
  ('Pesquisa de Satisfação', 'Aplicação de pesquisa NPS ou satisfação');

-- Default AT Action Types
INSERT INTO public.at_action_types (name, description) VALUES
  ('Reparo', 'Serviço de reparo em produto/instalação'),
  ('Troca', 'Substituição de produto ou componente'),
  ('Ajuste', 'Ajuste ou regulagem'),
  ('Vistoria', 'Vistoria técnica para diagnóstico'),
  ('Orientação', 'Orientação técnica ao cliente');