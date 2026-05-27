CREATE POLICY "Uploader or admin can update checklist attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'checklist-attachments'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  bucket_id = 'checklist-attachments'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
);