
-- 1) Tighten cleanliness-photos SELECT: only the uploading team_member or admin
DROP POLICY IF EXISTS "Authenticated can view cleanliness photos" ON storage.objects;

CREATE POLICY "Cleanliness photos: owner or admin can read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'cleanliness-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.store_cleanliness_checks c
      WHERE c.team_member_id = get_current_team_member_id()
        AND storage.objects.name = ANY (c.photos)
    )
  )
);

-- 2) Realtime: require authenticated to subscribe to channel topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can receive broadcasts"
ON realtime.messages FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can send broadcasts"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (true);
