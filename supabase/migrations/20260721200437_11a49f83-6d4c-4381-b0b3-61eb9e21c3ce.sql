-- Allow any authenticated user to move Pipeline cards (update projects).
-- Also fix the two cards where points/action were generated but status didn't move.

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;

CREATE POLICY "Authenticated users can update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Correct the two stuck cards: action + pontos já foram gerados no Pipeline
UPDATE public.projects
   SET planner_status = 'CONCLUIDO',
       planner_data_concluido = COALESCE(planner_data_concluido, NOW()),
       planner_status_at = NOW(),
       stage = 'em_negociacao'
 WHERE id IN (
   '55295b06-eb9b-44d1-a45f-4f0d5deb4fc9',
   '0ea66424-b6fa-4030-a6de-1b9ec8af7198'
 );
