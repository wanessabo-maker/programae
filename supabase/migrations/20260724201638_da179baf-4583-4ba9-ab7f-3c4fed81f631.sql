
DROP POLICY IF EXISTS "CS area users can manage cs_cases" ON public.cs_cases;

CREATE POLICY "CS area or admin can view cs_cases"
  ON public.cs_cases FOR SELECT
  USING (user_has_area(auth.uid(), 'customer_success'::functional_area) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin or responsible can insert cs_cases"
  ON public.cs_cases FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR responsible_id = get_current_team_member_id()
  );

CREATE POLICY "Admin or responsible can update cs_cases"
  ON public.cs_cases FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR responsible_id = get_current_team_member_id()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR responsible_id = get_current_team_member_id()
  );

CREATE POLICY "Admin or responsible can delete cs_cases"
  ON public.cs_cases FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR responsible_id = get_current_team_member_id()
  );
