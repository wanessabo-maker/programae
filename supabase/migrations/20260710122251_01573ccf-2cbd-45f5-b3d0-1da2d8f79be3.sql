
-- checklist_attachments: tighten INSERT
DROP POLICY IF EXISTS "Authenticated users can insert checklist_attachments" ON public.checklist_attachments;
CREATE POLICY "Users linked to project can insert checklist_attachments"
ON public.checklist_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    uploaded_by = get_current_team_member_id()
    AND EXISTS (
      SELECT 1
      FROM checklist_items ci
      JOIN contract_checklists cc ON cc.id = ci.checklist_id
      JOIN projects p ON p.id = cc.project_id
      WHERE ci.id = checklist_attachments.checklist_item_id
        AND (
          ci.assigned_to = get_current_team_member_id()
          OR p.created_by = get_current_team_member_id()
          OR p.responsible_id = get_current_team_member_id()
          OR cc.assigned_projetista_id = get_current_team_member_id()
          OR cc.assigned_logistica_id = get_current_team_member_id()
          OR cc.assigned_cs_id = get_current_team_member_id()
          OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
        )
    )
  )
);

-- checklist_items: tighten INSERT and UPDATE
DROP POLICY IF EXISTS "Authenticated users can insert checklist_items" ON public.checklist_items;
DROP POLICY IF EXISTS "Authenticated users can update checklist_items" ON public.checklist_items;

CREATE POLICY "Assigned or project owners can insert checklist_items"
ON public.checklist_items
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM contract_checklists cc
    JOIN projects p ON p.id = cc.project_id
    WHERE cc.id = checklist_items.checklist_id
      AND (
        p.created_by = get_current_team_member_id()
        OR p.responsible_id = get_current_team_member_id()
        OR cc.assigned_projetista_id = get_current_team_member_id()
        OR cc.assigned_logistica_id = get_current_team_member_id()
        OR cc.assigned_cs_id = get_current_team_member_id()
        OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
      )
  )
);

CREATE POLICY "Assigned or project owners can update checklist_items"
ON public.checklist_items
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR checklist_items.assigned_to = get_current_team_member_id()
  OR EXISTS (
    SELECT 1
    FROM contract_checklists cc
    JOIN projects p ON p.id = cc.project_id
    WHERE cc.id = checklist_items.checklist_id
      AND (
        p.created_by = get_current_team_member_id()
        OR p.responsible_id = get_current_team_member_id()
        OR cc.assigned_projetista_id = get_current_team_member_id()
        OR cc.assigned_logistica_id = get_current_team_member_id()
        OR cc.assigned_cs_id = get_current_team_member_id()
        OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
      )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR checklist_items.assigned_to = get_current_team_member_id()
  OR EXISTS (
    SELECT 1
    FROM contract_checklists cc
    JOIN projects p ON p.id = cc.project_id
    WHERE cc.id = checklist_items.checklist_id
      AND (
        p.created_by = get_current_team_member_id()
        OR p.responsible_id = get_current_team_member_id()
        OR cc.assigned_projetista_id = get_current_team_member_id()
        OR cc.assigned_logistica_id = get_current_team_member_id()
        OR cc.assigned_cs_id = get_current_team_member_id()
        OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
      )
  )
);

-- contract_checklists: tighten INSERT and UPDATE
DROP POLICY IF EXISTS "Authenticated users can insert contract_checklists" ON public.contract_checklists;
DROP POLICY IF EXISTS "Authenticated users can update contract_checklists" ON public.contract_checklists;

CREATE POLICY "Project owners or assignees can insert contract_checklists"
ON public.contract_checklists
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = contract_checklists.project_id
      AND (
        p.created_by = get_current_team_member_id()
        OR p.responsible_id = get_current_team_member_id()
      )
  )
);

CREATE POLICY "Project owners or assignees can update contract_checklists"
ON public.contract_checklists
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR contract_checklists.assigned_projetista_id = get_current_team_member_id()
  OR contract_checklists.assigned_logistica_id = get_current_team_member_id()
  OR contract_checklists.assigned_cs_id = get_current_team_member_id()
  OR contract_checklists.assigned_apresentacao_projetista_id = get_current_team_member_id()
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = contract_checklists.project_id
      AND (
        p.created_by = get_current_team_member_id()
        OR p.responsible_id = get_current_team_member_id()
      )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR contract_checklists.assigned_projetista_id = get_current_team_member_id()
  OR contract_checklists.assigned_logistica_id = get_current_team_member_id()
  OR contract_checklists.assigned_cs_id = get_current_team_member_id()
  OR contract_checklists.assigned_apresentacao_projetista_id = get_current_team_member_id()
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = contract_checklists.project_id
      AND (
        p.created_by = get_current_team_member_id()
        OR p.responsible_id = get_current_team_member_id()
      )
  )
);
