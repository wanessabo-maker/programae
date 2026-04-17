-- Function helper to get the Monday of the week for a given date
CREATE OR REPLACE FUNCTION public.week_start_monday(d date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (d - ((EXTRACT(ISODOW FROM d)::int - 1)))::date;
$$;

-- Table
CREATE TABLE public.store_cleanliness_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 0 AND 5),
  notes text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  week_start date NOT NULL DEFAULT public.week_start_monday(CURRENT_DATE),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One entry per member per week
CREATE UNIQUE INDEX store_cleanliness_unique_week
  ON public.store_cleanliness_checks (team_member_id, week_start);

CREATE INDEX store_cleanliness_week_idx
  ON public.store_cleanliness_checks (week_start DESC, checked_at DESC);

-- Enable RLS
ALTER TABLE public.store_cleanliness_checks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can read cleanliness"
ON public.store_cleanliness_checks
FOR SELECT
USING (public.is_authenticated());

CREATE POLICY "Members insert own cleanliness"
ON public.store_cleanliness_checks
FOR INSERT
WITH CHECK (
  team_member_id = public.get_current_team_member_id()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Members update own cleanliness"
ON public.store_cleanliness_checks
FOR UPDATE
USING (
  team_member_id = public.get_current_team_member_id()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Members delete own cleanliness"
ON public.store_cleanliness_checks
FOR DELETE
USING (
  team_member_id = public.get_current_team_member_id()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Realtime
ALTER TABLE public.store_cleanliness_checks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_cleanliness_checks;