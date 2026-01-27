-- Add assigned_cs_id column to contract_checklists
ALTER TABLE public.contract_checklists
ADD COLUMN assigned_cs_id uuid REFERENCES public.team_members(id);

-- Add index for better performance
CREATE INDEX idx_contract_checklists_assigned_cs_id ON public.contract_checklists(assigned_cs_id);