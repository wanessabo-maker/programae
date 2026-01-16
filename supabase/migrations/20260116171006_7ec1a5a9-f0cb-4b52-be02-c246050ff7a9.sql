-- Adicionar campo focco_project_number na tabela actions
ALTER TABLE public.actions ADD COLUMN focco_project_number text;

-- Adicionar coluna contract_number na tabela clients para rastrear contratos fechados
ALTER TABLE public.clients ADD COLUMN contract_number text;

-- Comentário para documentação
COMMENT ON COLUMN public.actions.focco_project_number IS 'Número do Projeto FOCCO - opcional, usado em ações de Apresentação';
COMMENT ON COLUMN public.clients.contract_number IS 'Número do contrato quando o cliente fecha negócio';