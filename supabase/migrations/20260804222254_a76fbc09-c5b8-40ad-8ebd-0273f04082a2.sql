ALTER TABLE public.contract_checklists
  ADD COLUMN IF NOT EXISTS closing_bonus_awarded boolean NOT NULL DEFAULT false;