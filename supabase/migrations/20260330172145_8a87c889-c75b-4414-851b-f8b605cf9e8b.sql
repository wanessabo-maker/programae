
-- Update projects SELECT RLS to include assigned_apresentacao_projetista_id
DROP POLICY IF EXISTS "Users can read own projects" ON public.projects;
CREATE POLICY "Users can read own projects" ON public.projects
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (created_by = get_current_team_member_id())
  OR (responsible_id = get_current_team_member_id())
  OR user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
  OR (EXISTS (
    SELECT 1 FROM contract_checklists cc
    WHERE cc.project_id = projects.id
    AND (
      cc.assigned_projetista_id = get_current_team_member_id()
      OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
      OR cc.assigned_logistica_id = get_current_team_member_id()
      OR cc.assigned_cs_id = get_current_team_member_id()
    )
  ))
);
