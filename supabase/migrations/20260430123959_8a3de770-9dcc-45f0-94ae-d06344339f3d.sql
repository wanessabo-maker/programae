ALTER TABLE public.store_cleanliness_checks
  ADD CONSTRAINT store_cleanliness_checks_team_member_id_fkey
  FOREIGN KEY (team_member_id)
  REFERENCES public.team_members(id)
  ON DELETE CASCADE;