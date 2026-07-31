CREATE OR REPLACE FUNCTION public.can_access_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = _project_id
        AND (
          p.created_by = public.get_current_team_member_id()
          OR p.responsible_id = public.get_current_team_member_id()
          OR p.apresentacao_projetista_id = public.get_current_team_member_id()
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.contract_checklists cc
      WHERE cc.project_id = _project_id
        AND (
          cc.assigned_projetista_id = public.get_current_team_member_id()
          OR cc.assigned_logistica_id = public.get_current_team_member_id()
          OR cc.assigned_cs_id = public.get_current_team_member_id()
          OR cc.assigned_apresentacao_projetista_id = public.get_current_team_member_id()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.checklist_items ci
      JOIN public.contract_checklists cc2 ON cc2.id = ci.checklist_id
      WHERE cc2.project_id = _project_id
        AND ci.assigned_to = public.get_current_team_member_id()
    );
$$;

-- contract_checklists
DROP POLICY IF EXISTS "Authenticated users can read contract_checklists" ON public.contract_checklists;
CREATE POLICY "Involved users can read contract_checklists"
ON public.contract_checklists FOR SELECT TO authenticated
USING (public.can_access_project(project_id));

-- checklist_history
DROP POLICY IF EXISTS "Authenticated users can read checklist_history" ON public.checklist_history;
DROP POLICY IF EXISTS "Authenticated users can insert checklist_history" ON public.checklist_history;

CREATE POLICY "Involved users can read checklist_history"
ON public.checklist_history FOR SELECT TO authenticated
USING (
  performed_by = public.get_current_team_member_id()
  OR EXISTS (
    SELECT 1 FROM public.checklist_items ci
    JOIN public.contract_checklists cc ON cc.id = ci.checklist_id
    WHERE ci.id = checklist_history.checklist_item_id
      AND (ci.assigned_to = public.get_current_team_member_id()
           OR public.can_access_project(cc.project_id))
  )
);

CREATE POLICY "Involved users can insert checklist_history"
ON public.checklist_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.checklist_items ci
    JOIN public.contract_checklists cc ON cc.id = ci.checklist_id
    WHERE ci.id = checklist_history.checklist_item_id
      AND (ci.assigned_to = public.get_current_team_member_id()
           OR public.can_access_project(cc.project_id))
  )
);

-- project_environments
DROP POLICY IF EXISTS "Authenticated users can view environments" ON public.project_environments;
DROP POLICY IF EXISTS "Authenticated users can insert environments" ON public.project_environments;

CREATE POLICY "Involved users can view environments"
ON public.project_environments FOR SELECT TO authenticated
USING (
  projetista_id = public.get_current_team_member_id()
  OR consultant_id = public.get_current_team_member_id()
  OR (project_id IS NOT NULL AND public.can_access_project(project_id))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Involved users can insert environments"
ON public.project_environments FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR projetista_id = public.get_current_team_member_id()
  OR consultant_id = public.get_current_team_member_id()
  OR (project_id IS NOT NULL AND public.can_access_project(project_id))
);

-- project_value_history
DROP POLICY IF EXISTS "Authenticated users can read project value history" ON public.project_value_history;
CREATE POLICY "Involved users can read project value history"
ON public.project_value_history FOR SELECT TO authenticated
USING (
  consultant_id = public.get_current_team_member_id()
  OR public.can_access_project(project_id)
);

-- goals
DROP POLICY IF EXISTS "Users can read own goals or comercial or admin" ON public.goals;
CREATE POLICY "Users can read own goals or comercial or admin"
ON public.goals FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.user_has_area(auth.uid(), 'comercial'::functional_area)
  OR team_member_id = public.get_current_team_member_id()
);