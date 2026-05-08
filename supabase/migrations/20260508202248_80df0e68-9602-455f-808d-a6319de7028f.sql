DROP POLICY IF EXISTS "Authenticated users can update projects for pipeline" ON public.projects;
CREATE POLICY "Authenticated users can update projects for pipeline"
ON public.projects
FOR UPDATE
TO authenticated
USING (is_authenticated())
WITH CHECK (is_authenticated());