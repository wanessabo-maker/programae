
-- Criar enum para áreas funcionais do sistema
CREATE TYPE public.functional_area AS ENUM ('comercial', 'projetos', 'customer_success', 'assistencia_tecnica');

-- Criar tabela de vínculo usuário-áreas (muitos para muitos)
CREATE TABLE public.user_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area functional_area NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, area)
);

-- Habilitar RLS
ALTER TABLE public.user_areas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_areas
CREATE POLICY "Users can view their own areas"
  ON public.user_areas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user areas"
  ON public.user_areas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Criar tabela de clientes (CRM avançado)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  cpf_cnpj TEXT,
  profession TEXT,
  age INTEGER,
  origin_type TEXT DEFAULT 'direct', -- 'professional' ou 'direct'
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  potential_value NUMERIC,
  preferences TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  responsible_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS para clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para clients
CREATE POLICY "Authenticated users can read clients"
  ON public.clients FOR SELECT
  USING (is_authenticated());

CREATE POLICY "Authenticated users can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (is_authenticated());

CREATE POLICY "Authenticated users can update clients"
  ON public.clients FOR UPDATE
  USING (is_authenticated());

CREATE POLICY "Authenticated users can delete clients"
  ON public.clients FOR DELETE
  USING (is_authenticated());

-- Criar tabela de interações com clientes (histórico)
CREATE TABLE public.client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'whatsapp', 'visit', etc.
  description TEXT,
  interaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS para client_interactions
ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_interactions
CREATE POLICY "Authenticated users can read interactions"
  ON public.client_interactions FOR SELECT
  USING (is_authenticated());

CREATE POLICY "Authenticated users can insert interactions"
  ON public.client_interactions FOR INSERT
  WITH CHECK (is_authenticated());

CREATE POLICY "Authenticated users can update interactions"
  ON public.client_interactions FOR UPDATE
  USING (is_authenticated());

CREATE POLICY "Authenticated users can delete interactions"
  ON public.client_interactions FOR DELETE
  USING (is_authenticated());

-- Criar tabela de projetos
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'prospecting', -- 'prospecting', 'negotiation', 'closed', 'in_progress', 'delivered', 'cancelled'
  stage TEXT DEFAULT 'lead', -- funil: 'lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  estimated_value NUMERIC,
  closed_value NUMERIC,
  closed_date DATE,
  start_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  responsible_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS para projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para projects
CREATE POLICY "Authenticated users can read projects"
  ON public.projects FOR SELECT
  USING (is_authenticated());

CREATE POLICY "Authenticated users can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (is_authenticated());

CREATE POLICY "Authenticated users can update projects"
  ON public.projects FOR UPDATE
  USING (is_authenticated());

CREATE POLICY "Authenticated users can delete projects"
  ON public.projects FOR DELETE
  USING (is_authenticated());

-- Criar tabela de assistência técnica
CREATE TABLE public.technical_assistance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'waiting_parts', 'scheduled', 'completed', 'cancelled'
  opened_date DATE DEFAULT CURRENT_DATE,
  scheduled_date DATE,
  completed_date DATE,
  responsible_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS para technical_assistance
ALTER TABLE public.technical_assistance ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para technical_assistance
CREATE POLICY "Authenticated users can read AT"
  ON public.technical_assistance FOR SELECT
  USING (is_authenticated());

CREATE POLICY "Authenticated users can insert AT"
  ON public.technical_assistance FOR INSERT
  WITH CHECK (is_authenticated());

CREATE POLICY "Authenticated users can update AT"
  ON public.technical_assistance FOR UPDATE
  USING (is_authenticated());

CREATE POLICY "Authenticated users can delete AT"
  ON public.technical_assistance FOR DELETE
  USING (is_authenticated());

-- Criar tabela de CS (Customer Success - pós-venda)
CREATE TABLE public.customer_success (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'onboarding', -- 'onboarding', 'active', 'at_risk', 'churned'
  health_score INTEGER DEFAULT 100, -- 0-100
  last_contact_date DATE,
  next_contact_date DATE,
  responsible_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS para customer_success
ALTER TABLE public.customer_success ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para customer_success
CREATE POLICY "Authenticated users can read CS"
  ON public.customer_success FOR SELECT
  USING (is_authenticated());

CREATE POLICY "Authenticated users can insert CS"
  ON public.customer_success FOR INSERT
  WITH CHECK (is_authenticated());

CREATE POLICY "Authenticated users can update CS"
  ON public.customer_success FOR UPDATE
  USING (is_authenticated());

CREATE POLICY "Authenticated users can delete CS"
  ON public.customer_success FOR DELETE
  USING (is_authenticated());

-- Função para verificar se usuário tem acesso a uma área funcional
CREATE OR REPLACE FUNCTION public.user_has_area(_user_id UUID, _area functional_area)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_areas
    WHERE user_id = _user_id
      AND area = _area
  ) OR has_role(_user_id, 'admin'::app_role)
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas novas tabelas
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_assistance_updated_at
  BEFORE UPDATE ON public.technical_assistance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_success_updated_at
  BEFORE UPDATE ON public.customer_success
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
