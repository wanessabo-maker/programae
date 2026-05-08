-- Allow all authenticated users to read projects so the Pipeline de Apresentações is visible to everyone
DROP POLICY IF EXISTS "Authenticated users can read projects for pipeline" ON public.projects;
CREATE POLICY "Authenticated users can read projects for pipeline"
ON public.projects
FOR SELECT
TO authenticated
USING (is_authenticated());