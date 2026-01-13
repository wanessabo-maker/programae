-- Áreas
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Equipe (Team Members)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tipos de Profissional
CREATE TABLE public.professional_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categorias de Profissionais
CREATE TABLE public.professional_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  condition TEXT NOT NULL,
  days INTEGER NOT NULL,
  hierarchy INTEGER NOT NULL DEFAULT 1,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tipos de Ação
CREATE TABLE public.action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  classification TEXT NOT NULL,
  impacts TEXT[] DEFAULT '{}',
  requires_value BOOLEAN DEFAULT false,
  additional_fields BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Metas
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Premiações (Rewards)
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profissionais
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type_id UUID REFERENCES public.professional_types(id) ON DELETE SET NULL,
  consultant_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.professional_categories(id) ON DELETE SET NULL,
  last_action_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ações
CREATE TABLE public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  action_type_id UUID REFERENCES public.action_types(id) ON DELETE SET NULL,
  action_date DATE NOT NULL,
  value NUMERIC,
  client_name TEXT,
  client_age INTEGER,
  client_profession TEXT,
  presentation_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lembretes
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  reminder_date DATE NOT NULL,
  consultant_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  recurrence TEXT DEFAULT 'once',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Datas Especiais
CREATE TABLE public.special_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  date_value DATE NOT NULL,
  recurrence TEXT DEFAULT 'annual',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transações de Crédito (Programa E+)
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  action_id UUID REFERENCES public.actions(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  description TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables (with public access since no auth)
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Public access policies (since no authentication)
CREATE POLICY "Public access" ON public.areas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.professional_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.professional_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.action_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.professionals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.special_dates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.credit_transactions FOR ALL USING (true) WITH CHECK (true);