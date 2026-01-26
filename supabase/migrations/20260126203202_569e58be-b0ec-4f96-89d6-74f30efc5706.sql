-- Create storage bucket for checklist attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist-attachments', 'checklist-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for checklist attachments
CREATE POLICY "Authenticated users can upload checklist attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'checklist-attachments' 
  AND is_authenticated()
);

CREATE POLICY "Authenticated users can view checklist attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'checklist-attachments' 
  AND is_authenticated()
);

CREATE POLICY "Users can delete own checklist attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'checklist-attachments' 
  AND is_authenticated()
);