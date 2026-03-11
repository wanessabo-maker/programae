
-- Allow all authenticated users to read all actions (for consolidated Dashboard)
DROP POLICY IF EXISTS "Users can read own actions or admin" ON public.actions;

CREATE POLICY "Authenticated users can read all actions"
ON public.actions
FOR SELECT
TO public
USING (is_authenticated());
