-- Add photos column to cleanliness checks
ALTER TABLE public.store_cleanliness_checks
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}'::text[];

-- Create public bucket for cleanliness photos (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleanliness-photos', 'cleanliness-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Cleanliness photos are publicly readable" ON storage.objects;
CREATE POLICY "Cleanliness photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'cleanliness-photos');

DROP POLICY IF EXISTS "Members can upload own cleanliness photos" ON storage.objects;
CREATE POLICY "Members can upload own cleanliness photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cleanliness-photos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = public.get_current_team_member_id()::text
  )
);

DROP POLICY IF EXISTS "Members can update own cleanliness photos" ON storage.objects;
CREATE POLICY "Members can update own cleanliness photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'cleanliness-photos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = public.get_current_team_member_id()::text
  )
);

DROP POLICY IF EXISTS "Members can delete own cleanliness photos" ON storage.objects;
CREATE POLICY "Members can delete own cleanliness photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cleanliness-photos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = public.get_current_team_member_id()::text
  )
);