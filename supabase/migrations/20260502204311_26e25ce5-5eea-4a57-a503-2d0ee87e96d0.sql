-- ============================================================
-- FASE 3 — Índices de performance + cron diário
-- ============================================================

-- 1) Índices de performance
CREATE INDEX IF NOT EXISTS idx_actions_action_date
  ON public.actions(action_date DESC);

CREATE INDEX IF NOT EXISTS idx_actions_consultant_date
  ON public.actions(consultant_id, action_date DESC);

CREATE INDEX IF NOT EXISTS idx_actions_project_id
  ON public.actions(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_actions_action_type_id
  ON public.actions(action_type_id);

CREATE INDEX IF NOT EXISTS idx_projects_responsible_stage
  ON public.projects(responsible_id, stage);

CREATE INDEX IF NOT EXISTS idx_projects_closed_date
  ON public.projects(closed_date)
  WHERE closed_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_consultant
  ON public.credit_transactions(consultant_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_professionals_consultant_id
  ON public.professionals(consultant_id);

CREATE INDEX IF NOT EXISTS idx_project_review_snoozes_active
  ON public.project_review_snoozes(project_id, snoozed_until);

-- 2) Cron diário (8h Brasília = 11h UTC) chamando a edge function
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stale-projects-daily') THEN
    PERFORM cron.unschedule('stale-projects-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'stale-projects-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jkhvejsczbmwpqimjjun.supabase.co/functions/v1/stale-projects-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraHZlanNjemJtd3BxaW1qanVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzAwMjQsImV4cCI6MjA4MzkwNjAyNH0.ChmfhNg2yg0nN-feAAF1JbnKkBN_aF-ZaeGPsJGkGZA'
    ),
    body := '{}'::jsonb
  );
  $$
);