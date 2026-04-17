
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;

CREATE POLICY "Users can update own projects"
ON public.projects
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR created_by = get_current_team_member_id()
  OR responsible_id = get_current_team_member_id()
  OR user_has_area(auth.uid(), 'comercial'::functional_area)
);
