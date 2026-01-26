-- Migrate data from user_areas (enum-based) to user_area_assignments (dynamic areas)
INSERT INTO public.user_area_assignments (user_id, area_id)
SELECT 
  ua.user_id,
  a.id as area_id
FROM public.user_areas ua
JOIN public.areas a ON (
  (ua.area = 'comercial' AND LOWER(a.name) = 'comercial') OR
  (ua.area = 'projetos' AND LOWER(a.name) = 'projetos') OR
  (ua.area = 'customer_success' AND (LOWER(a.name) LIKE '%customer%' OR LOWER(a.name) LIKE '%success%' OR LOWER(a.name) = 'cs')) OR
  (ua.area = 'assistencia_tecnica' AND (LOWER(a.name) LIKE '%assist%' OR LOWER(a.name) LIKE '%técnica%' OR LOWER(a.name) = 'at'))
)
ON CONFLICT (user_id, area_id) DO NOTHING;