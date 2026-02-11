
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read cs_cases" ON cs_cases;
DROP POLICY IF EXISTS "CS area users can manage cs_cases" ON cs_cases;
DROP POLICY IF EXISTS "Authenticated users can read cs_actions" ON cs_actions;
DROP POLICY IF EXISTS "CS area users can manage cs_actions" ON cs_actions;

-- CS CASES: Allow CS/AT area users and admins full access, PLUS responsible can see their own cases
CREATE POLICY "CS area users can manage cs_cases"
ON cs_cases FOR ALL
USING (
  user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Responsible can view own cs_cases"
ON cs_cases FOR SELECT
USING (
  responsible_id = get_current_team_member_id()
);

CREATE POLICY "Authenticated users can insert cs_cases"
ON cs_cases FOR INSERT
WITH CHECK (
  is_authenticated()
);

-- CS ACTIONS: Allow CS/AT area users and admins full access, PLUS responsible of the case can see actions
CREATE POLICY "CS area users can manage cs_actions"
ON cs_actions FOR ALL
USING (
  user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Responsible can view own cs_actions"
ON cs_actions FOR SELECT
USING (
  cs_case_id IN (
    SELECT id FROM cs_cases WHERE responsible_id = get_current_team_member_id()
  )
);

CREATE POLICY "Authenticated users can insert cs_actions"
ON cs_actions FOR INSERT
WITH CHECK (
  is_authenticated()
);
