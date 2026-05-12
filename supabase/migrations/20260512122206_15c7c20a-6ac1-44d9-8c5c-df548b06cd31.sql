-- 1. Coluna para marcar quando o projeto entrou em PAUSADO
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS planner_data_pausado timestamp with time zone NULL;

-- 2. Atualiza trigger de histórico de status
CREATE OR REPLACE FUNCTION public.fn_project_planner_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.planner_status IS DISTINCT FROM OLD.planner_status THEN
    IF NEW.planner_status = 'AGUARDANDO_INICIO' AND NEW.planner_data_aguardando IS NULL THEN NEW.planner_data_aguardando := NOW(); END IF;
    IF NEW.planner_status = 'INICIADO' AND NEW.planner_data_iniciado IS NULL THEN NEW.planner_data_iniciado := NOW(); END IF;
    IF NEW.planner_status = 'PAUSADO' THEN NEW.planner_data_pausado := NOW(); END IF;
    IF NEW.planner_status = 'CONCLUIDO' AND NEW.planner_data_concluido IS NULL THEN NEW.planner_data_concluido := NOW(); END IF;
    IF NEW.planner_status = 'VENDIDO' AND NEW.planner_data_vendido IS NULL THEN NEW.planner_data_vendido := NOW(); END IF;
    IF NEW.planner_status = 'PERDIDO' AND NEW.planner_data_perdido IS NULL THEN NEW.planner_data_perdido := NOW(); END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Função que expira PAUSADO > 30 dias e move para PERDIDO
CREATE OR REPLACE FUNCTION public.expire_pausado_projects()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.projects
       SET planner_status = 'PERDIDO',
           planner_data_perdido = COALESCE(planner_data_perdido, NOW()),
           planner_status_at = NOW(),
           stage = 'closed_lost',
           status = 'lost',
           planner_motivo_perda = COALESCE(planner_motivo_perda, 'Movido automaticamente: 30 dias em PAUSADO')
     WHERE planner_status = 'PAUSADO'
       AND planner_data_pausado IS NOT NULL
       AND planner_data_pausado < NOW() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

-- 4. Garante extensão pg_cron e agenda execução horária
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-pausado-projects') THEN
    PERFORM cron.unschedule('expire-pausado-projects');
  END IF;
  PERFORM cron.schedule(
    'expire-pausado-projects',
    '0 * * * *',
    $cron$ SELECT public.expire_pausado_projects(); $cron$
  );
END
$$;