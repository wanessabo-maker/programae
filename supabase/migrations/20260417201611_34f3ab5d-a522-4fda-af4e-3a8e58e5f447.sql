CREATE OR REPLACE FUNCTION public.week_start_monday(d date)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT (d - ((EXTRACT(ISODOW FROM d)::int - 1)))::date;
$$;