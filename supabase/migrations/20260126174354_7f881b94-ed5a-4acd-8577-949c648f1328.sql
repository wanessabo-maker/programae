-- Add area_id column to positions table (foreign key to areas)
ALTER TABLE public.positions 
ADD COLUMN area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_positions_area_id ON public.positions(area_id);

-- Insert default areas if they don't exist (to map existing functional areas)
INSERT INTO public.areas (name) VALUES ('Comercial')
ON CONFLICT DO NOTHING;

INSERT INTO public.areas (name) VALUES ('Projetos')
ON CONFLICT DO NOTHING;

INSERT INTO public.areas (name) VALUES ('Customer Success')
ON CONFLICT DO NOTHING;

INSERT INTO public.areas (name) VALUES ('Assistência Técnica')
ON CONFLICT DO NOTHING;

-- Update existing positions to link to corresponding areas
UPDATE public.positions p
SET area_id = (
  SELECT a.id FROM public.areas a 
  WHERE LOWER(a.name) = 'comercial' 
  LIMIT 1
)
WHERE p.area = 'comercial' AND p.area_id IS NULL;

UPDATE public.positions p
SET area_id = (
  SELECT a.id FROM public.areas a 
  WHERE LOWER(a.name) = 'projetos' 
  LIMIT 1
)
WHERE p.area = 'projetos' AND p.area_id IS NULL;

UPDATE public.positions p
SET area_id = (
  SELECT a.id FROM public.areas a 
  WHERE LOWER(a.name) LIKE '%customer%' OR LOWER(a.name) LIKE '%success%'
  LIMIT 1
)
WHERE p.area = 'customer_success' AND p.area_id IS NULL;

UPDATE public.positions p
SET area_id = (
  SELECT a.id FROM public.areas a 
  WHERE LOWER(a.name) LIKE '%assist%' OR LOWER(a.name) LIKE '%técnica%'
  LIMIT 1
)
WHERE p.area = 'assistencia_tecnica' AND p.area_id IS NULL;

-- Update the user_has_position_area function to work with both old and new system
CREATE OR REPLACE FUNCTION public.user_has_position_area(_user_id UUID, _area functional_area)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN team_member_positions tmp ON tmp.team_member_id = tm.id
    JOIN positions p ON p.id = tmp.position_id
    LEFT JOIN areas a ON a.id = p.area_id
    WHERE tm.user_id = _user_id
      AND p.is_active = true
      AND (
        p.area = _area
        OR (
          (_area = 'comercial' AND LOWER(a.name) = 'comercial')
          OR (_area = 'projetos' AND LOWER(a.name) = 'projetos')
          OR (_area = 'customer_success' AND (LOWER(a.name) LIKE '%customer%' OR LOWER(a.name) LIKE '%success%'))
          OR (_area = 'assistencia_tecnica' AND (LOWER(a.name) LIKE '%assist%' OR LOWER(a.name) LIKE '%técnica%'))
        )
      )
  ) OR has_role(_user_id, 'admin'::app_role)
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;