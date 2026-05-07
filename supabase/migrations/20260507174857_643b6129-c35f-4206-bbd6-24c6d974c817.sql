
-- 1. reminders: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can read" ON public.reminders;
CREATE POLICY "Users can read own reminders or admin"
ON public.reminders FOR SELECT
USING (consultant_id = get_current_team_member_id() OR has_role(auth.uid(), 'admin'::app_role));

-- 2. credit_transactions: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can read" ON public.credit_transactions;
CREATE POLICY "Users can read own transactions or admin"
ON public.credit_transactions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR consultant_id = get_current_team_member_id()
  OR EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = credit_transactions.professional_id
      AND p.consultant_id = get_current_team_member_id()
  )
);

-- 3. actions: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can read all actions" ON public.actions;
CREATE POLICY "Users can read own actions or comercial or admin"
ON public.actions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR consultant_id = get_current_team_member_id()
  OR user_has_area(auth.uid(), 'comercial'::functional_area)
  OR EXISTS (
    SELECT 1 FROM public.projects pr
    WHERE pr.id = actions.project_id
      AND (pr.created_by = get_current_team_member_id() OR pr.responsible_id = get_current_team_member_id())
  )
);

-- 4. goals: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can read" ON public.goals;
CREATE POLICY "Users can read own goals or comercial or admin"
ON public.goals FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'comercial'::functional_area)
  OR team_member_id = get_current_team_member_id()
  OR team_member_id IS NULL
);

-- 5. Storage: checklist-attachments DELETE — restrict to uploader or admin
DROP POLICY IF EXISTS "Users can delete own checklist attachments" ON storage.objects;
CREATE POLICY "Users can delete own checklist attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'checklist-attachments'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.checklist_attachments ca
      WHERE ca.file_url LIKE '%' || name
        AND ca.uploaded_by = get_current_team_member_id()
    )
  )
);

-- 6. cleanliness-photos: make bucket private and restrict SELECT to authenticated
UPDATE storage.buckets SET public = false WHERE id = 'cleanliness-photos';
DROP POLICY IF EXISTS "Cleanliness photos are publicly readable" ON storage.objects;
CREATE POLICY "Authenticated can view cleanliness photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'cleanliness-photos' AND auth.uid() IS NOT NULL);
