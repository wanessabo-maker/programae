
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.professionals;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.professionals;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.professionals;

CREATE POLICY "Consultant or admin can insert professionals"
  ON public.professionals FOR INSERT
  WITH CHECK (consultant_id = get_current_team_member_id() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultant or admin can update professionals"
  ON public.professionals FOR UPDATE
  USING (consultant_id = get_current_team_member_id() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (consultant_id = get_current_team_member_id() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultant or admin can delete professionals"
  ON public.professionals FOR DELETE
  USING (consultant_id = get_current_team_member_id() OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can insert project value history" ON public.project_value_history;
DROP POLICY IF EXISTS "Authenticated users can delete project value history" ON public.project_value_history;

CREATE POLICY "Consultant or admin can insert value history"
  ON public.project_value_history FOR INSERT
  WITH CHECK (consultant_id = get_current_team_member_id() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin only can delete value history"
  ON public.project_value_history FOR DELETE
  USING (has_role(auth.uid(), 'admin'));
