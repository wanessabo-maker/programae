
-- Expandir política de leitura de clientes para incluir colaboradores atribuídos ao checklist do projeto vinculado ao cliente
DROP POLICY IF EXISTS "Users can read own clients" ON public.clients;

CREATE POLICY "Users can read own clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (user_has_area(auth.uid(), 'comercial'::functional_area) AND created_by = get_current_team_member_id())
  OR (user_has_area(auth.uid(), 'comercial'::functional_area) AND responsible_id = get_current_team_member_id())
  OR (user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area) AND created_by = get_current_team_member_id())
  OR user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
  OR EXISTS (
    SELECT 1
    FROM projects p
    JOIN contract_checklists cc ON cc.project_id = p.id
    WHERE p.client_id = clients.id
      AND (
        cc.assigned_projetista_id = get_current_team_member_id()
        OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
        OR cc.assigned_logistica_id = get_current_team_member_id()
        OR cc.assigned_cs_id = get_current_team_member_id()
      )
  )
  OR EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.client_id = clients.id
      AND (p.created_by = get_current_team_member_id() OR p.responsible_id = get_current_team_member_id())
  )
);
