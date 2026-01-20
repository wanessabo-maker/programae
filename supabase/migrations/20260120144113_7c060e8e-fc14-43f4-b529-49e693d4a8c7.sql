-- Add team_member_id to goals table for individual goals
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES public.team_members(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_goals_team_member_id ON public.goals(team_member_id);

-- Drop existing policy if exists and create new one
DROP POLICY IF EXISTS "Team members can view their own goals" ON public.goals;

CREATE POLICY "Team members can view their own goals"
ON public.goals
FOR SELECT
USING (
  team_member_id IS NULL 
  OR team_member_id = public.get_current_team_member_id()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);