
-- 1) Restrict checklist-attachments storage INSERT
DROP POLICY IF EXISTS "Authenticated users can upload checklist attachments" ON storage.objects;

CREATE POLICY "Assigned users can upload checklist attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'checklist-attachments'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.contract_checklists cc
      JOIN public.projects p ON p.id = cc.project_id
      WHERE (
        p.created_by = get_current_team_member_id()
        OR p.responsible_id = get_current_team_member_id()
        OR cc.assigned_projetista_id = get_current_team_member_id()
        OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
        OR cc.assigned_logistica_id = get_current_team_member_id()
        OR cc.assigned_cs_id = get_current_team_member_id()
      )
    )
  )
);

-- 2) Align client_interactions SELECT with clients SELECT (CS/AT access)
DROP POLICY IF EXISTS "Users can read client interactions" ON public.client_interactions;

CREATE POLICY "Users can read client interactions"
ON public.client_interactions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_interactions.client_id
      AND (
        c.created_by = get_current_team_member_id()
        OR (user_has_area(auth.uid(), 'comercial'::functional_area) AND c.responsible_id = get_current_team_member_id())
        OR user_has_area(auth.uid(), 'customer_success'::functional_area)
        OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
      )
  )
);

-- 3) Defense-in-depth: restrictive policy preventing non-admins from inserting roles
CREATE POLICY "Only admins can insert user roles"
ON public.user_roles AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
