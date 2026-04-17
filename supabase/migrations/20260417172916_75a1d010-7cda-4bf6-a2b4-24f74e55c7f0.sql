
CREATE TABLE public.project_review_snoozes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  snoozed_by uuid NOT NULL,
  snoozed_until date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_review_snoozes_project ON public.project_review_snoozes(project_id);

ALTER TABLE public.project_review_snoozes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read snoozes"
  ON public.project_review_snoozes FOR SELECT
  USING (is_authenticated());

CREATE POLICY "Owner or admin insert snoozes"
  ON public.project_review_snoozes FOR INSERT
  WITH CHECK (snoozed_by = get_current_team_member_id() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin delete snoozes"
  ON public.project_review_snoozes FOR DELETE
  USING (snoozed_by = get_current_team_member_id() OR has_role(auth.uid(), 'admin'::app_role));
