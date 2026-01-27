-- Add assigned_to column to checklist_items for specific person assignment
ALTER TABLE checklist_items
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES team_members(id);

-- Add comment explaining the column
COMMENT ON COLUMN checklist_items.assigned_to IS 'Specific team member assigned to this checklist item. For commercial items, this is the project responsible. For technical/logistics items, this is assigned during sale registration.';

-- Add fields to contract_checklists to store the assigned professionals
ALTER TABLE contract_checklists
ADD COLUMN IF NOT EXISTS assigned_projetista_id uuid REFERENCES team_members(id),
ADD COLUMN IF NOT EXISTS assigned_logistica_id uuid REFERENCES team_members(id);

COMMENT ON COLUMN contract_checklists.assigned_projetista_id IS 'Projetista Técnico assigned to this contract checklist';
COMMENT ON COLUMN contract_checklists.assigned_logistica_id IS 'Analista de Logística assigned to this contract checklist';