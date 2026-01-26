-- =============================================
-- NOVA ESTRUTURA: ÁREA → CARGO → EQUIPE
-- =============================================

-- 1. CRIAR TABELA DE CARGOS (vinculados a uma área funcional)
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  area functional_area NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. CRIAR TABELA DE PERMISSÕES POR CARGO
-- Permissões granulares: visualizar, criar, editar, deletar
CREATE TYPE public.permission_type AS ENUM ('view', 'create', 'edit', 'delete');

CREATE TABLE public.position_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  resource TEXT NOT NULL, -- ex: 'clients', 'projects', 'actions', etc.
  permission permission_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(position_id, resource, permission)
);

-- 3. CRIAR TABELA DE VÍNCULO MEMBRO ↔ CARGOS (múltiplos cargos por membro)
CREATE TABLE public.team_member_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_member_id, position_id)
);

-- 4. HABILITAR RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_positions ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS PARA POSITIONS
CREATE POLICY "Admins can manage positions"
ON public.positions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read positions"
ON public.positions FOR SELECT TO authenticated
USING (is_authenticated());

-- 6. POLÍTICAS RLS PARA POSITION_PERMISSIONS
CREATE POLICY "Admins can manage position_permissions"
ON public.position_permissions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read position_permissions"
ON public.position_permissions FOR SELECT TO authenticated
USING (is_authenticated());

-- 7. POLÍTICAS RLS PARA TEAM_MEMBER_POSITIONS
CREATE POLICY "Admins can manage team_member_positions"
ON public.team_member_positions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read team_member_positions"
ON public.team_member_positions FOR SELECT TO authenticated
USING (is_authenticated());

-- 8. FUNÇÃO PARA VERIFICAR SE USUÁRIO TEM ACESSO A UMA ÁREA VIA CARGO
CREATE OR REPLACE FUNCTION public.user_has_position_area(_user_id UUID, _area functional_area)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN team_member_positions tmp ON tmp.team_member_id = tm.id
    JOIN positions p ON p.id = tmp.position_id
    WHERE tm.user_id = _user_id
      AND p.area = _area
      AND p.is_active = true
  ) OR has_role(_user_id, 'admin'::app_role)
$$;

-- 9. FUNÇÃO PARA VERIFICAR SE USUÁRIO TEM PERMISSÃO ESPECÍFICA
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id UUID, _resource TEXT, _permission permission_type)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN team_member_positions tmp ON tmp.team_member_id = tm.id
    JOIN positions p ON p.id = tmp.position_id
    JOIN position_permissions pp ON pp.position_id = p.id
    WHERE tm.user_id = _user_id
      AND pp.resource = _resource
      AND pp.permission = _permission
      AND p.is_active = true
  ) OR has_role(_user_id, 'admin'::app_role)
$$;

-- 10. MIGRAR DADOS EXISTENTES DE user_areas PARA O NOVO SISTEMA
-- Criar cargos padrão para cada área funcional existente
INSERT INTO public.positions (name, area, description) VALUES
  ('Consultor Comercial', 'comercial', 'Acesso padrão à área comercial'),
  ('Gerente de Projetos', 'projetos', 'Acesso padrão à área de projetos'),
  ('Analista CS', 'customer_success', 'Acesso padrão à área de Customer Success'),
  ('Técnico AT', 'assistencia_tecnica', 'Acesso padrão à área de Assistência Técnica');

-- Criar permissões padrão para cada cargo (view, create, edit, delete)
INSERT INTO public.position_permissions (position_id, resource, permission)
SELECT p.id, r.resource, perm.permission
FROM public.positions p
CROSS JOIN (VALUES ('clients'), ('projects'), ('actions'), ('professionals')) AS r(resource)
CROSS JOIN (VALUES ('view'::permission_type), ('create'::permission_type), ('edit'::permission_type), ('delete'::permission_type)) AS perm(permission)
WHERE 
  (p.area = 'comercial' AND r.resource IN ('clients', 'projects', 'actions', 'professionals'))
  OR (p.area = 'projetos' AND r.resource IN ('projects', 'clients'))
  OR (p.area = 'customer_success' AND r.resource IN ('clients', 'projects'))
  OR (p.area = 'assistencia_tecnica' AND r.resource IN ('clients', 'projects'));

-- Migrar usuários existentes para os cargos correspondentes
INSERT INTO public.team_member_positions (team_member_id, position_id)
SELECT tm.id, p.id
FROM public.user_areas ua
JOIN public.team_members tm ON tm.user_id = ua.user_id
JOIN public.positions p ON p.area = ua.area
ON CONFLICT (team_member_id, position_id) DO NOTHING;

-- 11. ATUALIZAR FUNÇÃO user_has_area PARA USAR O NOVO SISTEMA
CREATE OR REPLACE FUNCTION public.user_has_area(_user_id UUID, _area functional_area)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Primeiro verifica no novo sistema de cargos
  SELECT EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN team_member_positions tmp ON tmp.team_member_id = tm.id
    JOIN positions p ON p.id = tmp.position_id
    WHERE tm.user_id = _user_id
      AND p.area = _area
      AND p.is_active = true
  ) 
  -- Fallback para sistema antigo durante transição
  OR EXISTS (
    SELECT 1
    FROM public.user_areas
    WHERE user_id = _user_id
      AND area = _area
  )
  OR has_role(_user_id, 'admin'::app_role)
$$;