
-- 1. planner_status_history: drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated can view planner history" ON public.planner_status_history;

-- 2. checklist_items: replace broad SELECT with scoped policy (matching UPDATE)
DROP POLICY IF EXISTS "Authenticated users can read checklist_items" ON public.checklist_items;
CREATE POLICY "Users with project access can read checklist_items"
ON public.checklist_items
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR assigned_to = get_current_team_member_id()
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

-- 3. checklist_attachments (table): scope SELECT
DROP POLICY IF EXISTS "Authenticated users can read checklist_attachments" ON public.checklist_attachments;
CREATE POLICY "Users with project access can read checklist_attachments"
ON public.checklist_attachments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR uploaded_by = get_current_team_member_id()
  OR EXISTS (
    SELECT 1
    FROM checklist_items ci
    JOIN contract_checklists cc ON cc.id = ci.checklist_id
    JOIN projects p ON p.id = cc.project_id
    WHERE ci.id = checklist_attachments.checklist_item_id
      AND (
        p.created_by = get_current_team_member_id()
        OR p.responsible_id = get_current_team_member_id()
        OR ci.assigned_to = get_current_team_member_id()
        OR cc.assigned_projetista_id = get_current_team_member_id()
        OR cc.assigned_logistica_id = get_current_team_member_id()
        OR cc.assigned_cs_id = get_current_team_member_id()
        OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
      )
  )
);

-- 4. checklist-attachments storage bucket: scope SELECT
DROP POLICY IF EXISTS "Authenticated users can view checklist attachments" ON storage.objects;
CREATE POLICY "Users with project access can view checklist attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'checklist-attachments'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM checklist_attachments ca
      JOIN checklist_items ci ON ci.id = ca.checklist_item_id
      JOIN contract_checklists cc ON cc.id = ci.checklist_id
      JOIN projects p ON p.id = cc.project_id
      WHERE ca.file_url LIKE ('%' || storage.objects.name)
        AND (
          ca.uploaded_by = get_current_team_member_id()
          OR p.created_by = get_current_team_member_id()
          OR p.responsible_id = get_current_team_member_id()
          OR ci.assigned_to = get_current_team_member_id()
          OR cc.assigned_projetista_id = get_current_team_member_id()
          OR cc.assigned_logistica_id = get_current_team_member_id()
          OR cc.assigned_cs_id = get_current_team_member_id()
          OR cc.assigned_apresentacao_projetista_id = get_current_team_member_id()
        )
    )
  )
);
