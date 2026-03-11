-- Drop the restrictive "Team members can view their own goals" policy
-- that blocks non-admin users from seeing other members' goals.
-- The "Authenticated users can read" policy already provides appropriate SELECT access.
-- Goals are organizational targets, not sensitive data.
DROP POLICY IF EXISTS "Team members can view their own goals" ON public.goals;