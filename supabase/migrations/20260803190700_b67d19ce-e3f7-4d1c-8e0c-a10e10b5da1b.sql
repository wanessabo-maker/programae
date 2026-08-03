CREATE TABLE public.daily_time_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  block_date date NOT NULL,
  period text NOT NULL,
  block_type text NOT NULL,
  activity_kind text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (team_member_id, block_date, period)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_time_blocks TO authenticated;
GRANT ALL ON public.daily_time_blocks TO service_role;

ALTER TABLE public.daily_time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their own time blocks"
  ON public.daily_time_blocks FOR ALL TO authenticated
  USING (team_member_id = public.get_current_team_member_id() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_daily_time_blocks_updated_at
  BEFORE UPDATE ON public.daily_time_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.fn_validate_daily_time_block()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.period NOT IN ('manha','tarde') THEN
    RAISE EXCEPTION 'Período inválido: %', NEW.period;
  END IF;
  IF NEW.block_type NOT IN ('atividade_fim','operacional') THEN
    RAISE EXCEPTION 'Tipo de bloco inválido: %', NEW.block_type;
  END IF;
  IF NEW.activity_kind IS NOT NULL AND NEW.activity_kind NOT IN ('prospeccao','relacionamento','apresentacao','fechamento') THEN
    RAISE EXCEPTION 'Foco de atividade inválido: %', NEW.activity_kind;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_daily_time_block
  BEFORE INSERT OR UPDATE ON public.daily_time_blocks
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_daily_time_block();