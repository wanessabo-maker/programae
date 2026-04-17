DROP POLICY IF EXISTS "Users can read own projects" ON public.projects;

CREATE POLICY "Commercial users and owners can read projects"
ON public.projects
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'comercial'::functional_area)
  OR (created_by = get_current_team_member_id())
  OR (responsible_id = get_current_team_member_id())
  OR EXISTS (
    SELECT 1
    FROM contract_checklists cc
    WHERE cc.project_id = projects.id
      AND (
        cc.assigned_projetista_id = get_current_team_member_id()
        OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
        OR cc.assigned_logistica_id = get_current_team_member_id()
        OR cc.assigned_cs_id = get_current_team_member_id()
      )
  )
  OR user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
);