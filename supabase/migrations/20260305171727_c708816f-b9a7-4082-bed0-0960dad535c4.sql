
-- Fix projects RLS: allow responsible_id to SELECT and UPDATE their own projects
DROP POLICY IF EXISTS "Users can read own projects" ON projects;
CREATE POLICY "Users can read own projects"
ON projects FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR created_by = get_current_team_member_id()
  OR responsible_id = get_current_team_member_id()
  OR user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR created_by = get_current_team_member_id()
  OR responsible_id = get_current_team_member_id()
);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR created_by = get_current_team_member_id()
  OR responsible_id = get_current_team_member_id()
);
