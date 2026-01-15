-- Add user_id column to team_members table to link consultants to auth users
ALTER TABLE public.team_members ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

-- Create a helper function to get the current team member ID based on the authenticated user
CREATE OR REPLACE FUNCTION public.get_current_team_member_id()
RETURNS UUID AS $$
  SELECT id FROM public.team_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;