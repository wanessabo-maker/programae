DROP POLICY IF EXISTS "Authenticated users can view planner status history" ON public.planner_status_history;
DROP POLICY IF EXISTS "Users can view planner status history" ON public.planner_status_history;

CREATE POLICY "Users with project access can view status history"
ON public.planner_status_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'comercial'::functional_area)
  OR user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = planner_status_history.project_id
      AND (
        p.created_by = get_current_team_member_id()
        OR p.responsible_id = get_current_team_member_id()
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.contract_checklists cc
    WHERE cc.project_id = planner_status_history.project_id
      AND (
        cc.assigned_projetista_id = get_current_team_member_id()
        OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
        OR cc.assigned_logistica_id = get_current_team_member_id()
        OR cc.assigned_cs_id = get_current_team_member_id()
      )
  )
  OR moved_by_user_id = auth.uid()
);