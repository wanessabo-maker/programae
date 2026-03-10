
DROP POLICY "Users can read own clients" ON public.clients;

CREATE POLICY "Users can read own clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (user_has_area(auth.uid(), 'comercial'::functional_area) AND (created_by = get_current_team_member_id()))
  OR (user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area) AND (created_by = get_current_team_member_id()))
  OR user_has_area(auth.uid(), 'customer_success'::functional_area)
);
