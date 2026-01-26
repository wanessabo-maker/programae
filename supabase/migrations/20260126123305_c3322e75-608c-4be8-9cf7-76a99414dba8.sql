-- Drop existing INSERT policy on clients
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;

-- Create new INSERT policy that allows both comercial and assistencia_tecnica users
CREATE POLICY "Users can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins can insert anything
  has_role(auth.uid(), 'admin'::app_role) 
  OR
  -- Comercial users can insert if they set themselves as created_by
  (user_has_area(auth.uid(), 'comercial'::functional_area) AND (created_by = get_current_team_member_id() OR created_by IS NULL))
  OR
  -- AT users can also create clients (post-sale clients)
  (user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area) AND (created_by = get_current_team_member_id() OR created_by IS NULL))
);