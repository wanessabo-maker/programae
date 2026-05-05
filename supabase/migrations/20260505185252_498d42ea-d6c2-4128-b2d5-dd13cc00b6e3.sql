
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS planner_status TEXT
    CHECK (planner_status IN ('AGUARDANDO_INICIO','INICIADO','CONCLUIDO','VENDIDO','PERDIDO','PAUSADO')),
  ADD COLUMN IF NOT EXISTS planner_data_aguardando TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planner_data_iniciado   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planner_data_concluido  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planner_data_vendido    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planner_data_perdido    TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.fn_project_planner_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.planner_status IS DISTINCT FROM OLD.planner_status THEN
    IF NEW.planner_status = 'AGUARDANDO_INICIO' AND NEW.planner_data_aguardando IS NULL THEN NEW.planner_data_aguardando := NOW(); END IF;
    IF NEW.planner_status = 'INICIADO' AND NEW.planner_data_iniciado IS NULL THEN NEW.planner_data_iniciado := NOW(); END IF;
    IF NEW.planner_status = 'CONCLUIDO' AND NEW.planner_data_concluido IS NULL THEN NEW.planner_data_concluido := NOW(); END IF;
    IF NEW.planner_status = 'VENDIDO' AND NEW.planner_data_vendido IS NULL THEN NEW.planner_data_vendido := NOW(); END IF;
    IF NEW.planner_status = 'PERDIDO' AND NEW.planner_data_perdido IS NULL THEN NEW.planner_data_perdido := NOW(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_planner_status ON public.projects;
CREATE TRIGGER trg_project_planner_status
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.fn_project_planner_status();

CREATE OR REPLACE VIEW public.vw_planner_apresentacao AS
SELECT
  p.id, p.name, p.planner_status,
  p.created_at AS data_captacao,
  p.planner_data_aguardando, p.planner_data_iniciado, p.planner_data_concluido,
  p.planner_data_vendido, p.planner_data_perdido,
  CASE WHEN p.planner_data_aguardando IS NOT NULL AND p.created_at IS NOT NULL
       THEN EXTRACT(DAY FROM (p.planner_data_aguardando - p.created_at))::INT END AS planner_dias_ate_aguardando,
  CASE WHEN p.planner_data_iniciado IS NOT NULL AND p.planner_data_aguardando IS NOT NULL
       THEN EXTRACT(DAY FROM (p.planner_data_iniciado - p.planner_data_aguardando))::INT
       WHEN p.planner_data_aguardando IS NOT NULL
       THEN EXTRACT(DAY FROM (NOW() - p.planner_data_aguardando))::INT END AS planner_dias_aguardando,
  CASE WHEN p.planner_data_concluido IS NOT NULL AND p.planner_data_iniciado IS NOT NULL
       THEN EXTRACT(DAY FROM (p.planner_data_concluido - p.planner_data_iniciado))::INT
       WHEN p.planner_data_iniciado IS NOT NULL
       THEN EXTRACT(DAY FROM (NOW() - p.planner_data_iniciado))::INT END AS planner_dias_iniciado,
  p.apresentacao_projetista_id, p.responsible_id, p.client_id,
  p.status AS project_status,
  tm_ap.name AS projetista_nome, tm_resp.name AS consultor_nome,
  cl.name AS cliente_nome, cl.contract_number,
  (SELECT COUNT(*) FROM public.project_environments pe WHERE pe.project_id = p.id) AS qtd_ambientes
FROM public.projects p
LEFT JOIN public.team_members tm_ap   ON tm_ap.id   = p.apresentacao_projetista_id
LEFT JOIN public.team_members tm_resp ON tm_resp.id = p.responsible_id
LEFT JOIN public.clients      cl      ON cl.id      = p.client_id
WHERE p.planner_status IS NOT NULL;

DELETE FROM public.projects WHERE notes = '[planner_import_2026]';

INSERT INTO public.projects (name, planner_status, planner_data_aguardando, planner_data_iniciado, status, stage, notes) VALUES
  ('Jaque e Marcus - Rodrigo Ferreira','PAUSADO','2024-02-05','2024-02-05','active','em_negociacao','[planner_import_2026]'),
  ('NICOLE E PEDRO PAULO','PAUSADO','2024-06-27','2024-06-27','active','em_negociacao','[planner_import_2026]'),
  ('JOÃO','PAUSADO','2024-10-03','2024-10-03','active','em_negociacao','[planner_import_2026]'),
  ('João - Amigo Nelson','PAUSADO',NULL,NULL,'active','em_negociacao','[planner_import_2026]'),
  ('TATIANE CHAVES','PAUSADO',NULL,NULL,'active','em_negociacao','[planner_import_2026]'),
  ('TELLURE','PAUSADO','2025-04-07','2025-04-07','active','em_negociacao','[planner_import_2026]'),
  ('THAYS E IRINEU','PAUSADO','2025-05-27','2025-05-27','active','em_negociacao','[planner_import_2026]'),
  ('JESSICA E NELSON','PAUSADO',NULL,NULL,'active','em_negociacao','[planner_import_2026]'),
  ('Matheus Xavier','PAUSADO','2025-05-26','2025-05-26','active','em_negociacao','[planner_import_2026]'),
  ('LÚCIO CORTIZO 1905','PAUSADO',NULL,NULL,'active','em_negociacao','[planner_import_2026]'),
  ('ARDALA E JOÃO','PAUSADO',NULL,NULL,'active','em_negociacao','[planner_import_2026]'),
  ('MARINA E ARTUR','PAUSADO',NULL,NULL,'active','em_negociacao','[planner_import_2026]'),
  ('CUSTODIO 105','PAUSADO',NULL,NULL,'active','em_negociacao','[planner_import_2026]'),
  ('LIZ','PAUSADO',NULL,NULL,'active','em_negociacao','[planner_import_2026]'),
  ('TONY E JANAYNA','PAUSADO',NULL,NULL,'active','em_negociacao','[planner_import_2026]'),
  ('Larissa e Bruno','INICIADO',NULL,NOW(),'active','em_negociacao','[planner_import_2026]'),
  ('ALESSANDRA CÂMARA','INICIADO',NULL,NOW(),'active','em_negociacao','[planner_import_2026]'),
  ('SAMMEA - CASA DO BARCO','INICIADO',NULL,NOW(),'active','em_negociacao','[planner_import_2026]'),
  ('MARCIO - APARTAMENTO FINAL 3','INICIADO',NULL,NOW(),'active','em_negociacao','[planner_import_2026]'),
  ('Brasal Incorporações','INICIADO',NULL,NOW(),'active','em_negociacao','[planner_import_2026]'),
  ('Victoria Miranda','INICIADO',NULL,NOW(),'active','em_negociacao','[planner_import_2026]'),
  ('ANDRÉ E BRUNNA','INICIADO',NULL,NOW(),'active','em_negociacao','[planner_import_2026]'),
  ('MARINA E PEDRO','INICIADO',NULL,NOW(),'active','em_negociacao','[planner_import_2026]'),
  ('GABRIELE E DANILO','AGUARDANDO_INICIO',NOW(),NULL,'active','em_negociacao','[planner_import_2026]'),
  ('GLÁUCIA E EDUARDO','AGUARDANDO_INICIO',NOW(),NULL,'active','em_negociacao','[planner_import_2026]');
