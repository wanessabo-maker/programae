
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.reminders;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.reminders;
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.reminders;

-- Create ownership-based policies
CREATE POLICY "Users can insert own reminders"
ON public.reminders FOR INSERT
WITH CHECK (
  consultant_id = get_current_team_member_id()
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update own reminders or admin"
ON public.reminders FOR UPDATE
USING (
  consultant_id = get_current_team_member_id()
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can delete own reminders or admin"
ON public.reminders FOR DELETE
USING (
  consultant_id = get_current_team_member_id()
  OR has_role(auth.uid(), 'admin'::app_role)
);
