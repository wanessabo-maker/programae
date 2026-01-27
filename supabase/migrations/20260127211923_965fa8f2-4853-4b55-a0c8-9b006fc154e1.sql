-- ============================================
-- ÁREA DE PROJETOS - Schema para Ambientes
-- ============================================

-- Tabela para rastrear ambientes produzidos (Projeto de Apresentação e Projeto Técnico)
CREATE TABLE public.project_environments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Tipo de ambiente: 'apresentacao' ou 'tecnico'
  environment_type TEXT NOT NULL CHECK (environment_type IN ('apresentacao', 'tecnico')),
  
  -- Quantidade de ambientes produzidos
  environment_count INTEGER NOT NULL DEFAULT 1 CHECK (environment_count > 0),
  
  -- Relacionamentos
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  action_id UUID REFERENCES public.actions(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES public.checklist_items(id) ON DELETE SET NULL,
  
  -- Vínculos obrigatórios
  projetista_id UUID NOT NULL REFERENCES public.team_members(id),
  consultant_id UUID REFERENCES public.team_members(id), -- Consultor atendido (para apresentação)
  
  -- Mês de competência
  competence_month DATE NOT NULL,
  
  -- Metadados
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_project_environments_type ON public.project_environments(environment_type);
CREATE INDEX idx_project_environments_projetista ON public.project_environments(projetista_id);
CREATE INDEX idx_project_environments_consultant ON public.project_environments(consultant_id);
CREATE INDEX idx_project_environments_competence ON public.project_environments(competence_month);
CREATE INDEX idx_project_environments_project ON public.project_environments(project_id);
CREATE INDEX idx_project_environments_action ON public.project_environments(action_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_project_environments_updated_at
  BEFORE UPDATE ON public.project_environments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.project_environments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Leitura: usuários autenticados podem visualizar todos os ambientes
CREATE POLICY "Authenticated users can view environments" 
  ON public.project_environments 
  FOR SELECT 
  USING (is_authenticated());

-- Inserção: usuários autenticados podem inserir
CREATE POLICY "Authenticated users can insert environments" 
  ON public.project_environments 
  FOR INSERT 
  WITH CHECK (is_authenticated());

-- Atualização: apenas admin ou projetista responsável
CREATE POLICY "Admin or projetista can update environments" 
  ON public.project_environments 
  FOR UPDATE 
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR projetista_id = get_current_team_member_id()
  );

-- Exclusão: apenas admin
CREATE POLICY "Only admin can delete environments" 
  ON public.project_environments 
  FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- Adicionar campo environment_count na tabela actions
-- para Projetos de Apresentação
-- ============================================
ALTER TABLE public.actions 
ADD COLUMN IF NOT EXISTS environment_count INTEGER DEFAULT NULL;

-- ============================================
-- Adicionar campo environment_count em checklist_items
-- para Projetos Técnicos
-- ============================================
ALTER TABLE public.checklist_items
ADD COLUMN IF NOT EXISTS environment_count INTEGER DEFAULT NULL;

-- ============================================
-- Comentários para documentação
-- ============================================
COMMENT ON TABLE public.project_environments IS 'Rastreia ambientes produzidos por projetistas (apresentação e técnico)';
COMMENT ON COLUMN public.project_environments.environment_type IS 'Tipo: apresentacao (antes da venda) ou tecnico (após venda)';
COMMENT ON COLUMN public.project_environments.environment_count IS 'Quantidade de ambientes produzidos neste registro';
COMMENT ON COLUMN public.project_environments.projetista_id IS 'Projetista responsável pela produção';
COMMENT ON COLUMN public.project_environments.consultant_id IS 'Consultor comercial atendido (apenas para apresentação)';
COMMENT ON COLUMN public.project_environments.competence_month IS 'Mês de competência do registro (primeiro dia do mês)';