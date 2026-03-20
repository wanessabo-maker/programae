-- Fix RLS policy for clients UPDATE to also allow responsible_id updates
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;

CREATE POLICY "Users can update own clients"
ON public.clients
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (user_has_area(auth.uid(), 'comercial'::functional_area) AND (created_by = get_current_team_member_id()))
  OR (user_has_area(auth.uid(), 'comercial'::functional_area) AND (responsible_id = get_current_team_member_id()))
);