-- Allow admins and project owners to delete contract_checklists
CREATE POLICY "Admins and owners can delete contract_checklists"
ON public.contract_checklists FOR DELETE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = contract_checklists.project_id
    AND (p.created_by = get_current_team_member_id() OR p.responsible_id = get_current_team_member_id())
  )
);

-- Allow admins and owners to delete checklist_items
CREATE POLICY "Admins and owners can delete checklist_items"
ON public.checklist_items FOR DELETE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM contract_checklists cc
    JOIN projects p ON p.id = cc.project_id
    WHERE cc.id = checklist_items.checklist_id
    AND (p.created_by = get_current_team_member_id() OR p.responsible_id = get_current_team_member_id())
  )
);

-- Allow admins and owners to delete checklist_history
CREATE POLICY "Admins and owners can delete checklist_history"
ON public.checklist_history FOR DELETE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM checklist_items ci
    JOIN contract_checklists cc ON cc.id = ci.checklist_id
    JOIN projects p ON p.id = cc.project_id
    WHERE ci.id = checklist_history.checklist_item_id
    AND (p.created_by = get_current_team_member_id() OR p.responsible_id = get_current_team_member_id())
  )
);

-- Allow admins and owners to delete checklist_attachments
CREATE POLICY "Admins and owners can delete checklist_attachments_cascade"
ON public.checklist_attachments FOR DELETE
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM checklist_items ci
    JOIN contract_checklists cc ON cc.id = ci.checklist_id
    JOIN projects p ON p.id = cc.project_id
    WHERE ci.id = checklist_attachments.checklist_item_id
    AND (p.created_by = get_current_team_member_id() OR p.responsible_id = get_current_team_member_id())
  )
);