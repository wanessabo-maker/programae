-- Drop existing modification policies on special_dates
DROP POLICY IF EXISTS "Users can insert special dates" ON public.special_dates;
DROP POLICY IF EXISTS "Users can update special dates" ON public.special_dates;
DROP POLICY IF EXISTS "Users can delete special dates" ON public.special_dates;
DROP POLICY IF EXISTS "Authenticated users can insert special_dates" ON public.special_dates;
DROP POLICY IF EXISTS "Authenticated users can update special_dates" ON public.special_dates;
DROP POLICY IF EXISTS "Authenticated users can delete special_dates" ON public.special_dates;

-- Create secure INSERT policy: Only consultant of the professional or admin can insert
CREATE POLICY "Consultant or admin can insert special dates"
ON public.special_dates
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_id
    AND p.consultant_id = get_current_team_member_id()
  )
);

-- Create secure UPDATE policy: Only consultant of the professional or admin can update
CREATE POLICY "Consultant or admin can update special dates"
ON public.special_dates
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_id
    AND p.consultant_id = get_current_team_member_id()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_id
    AND p.consultant_id = get_current_team_member_id()
  )
);

-- Create secure DELETE policy: Only consultant of the professional or admin can delete
CREATE POLICY "Consultant or admin can delete special dates"
ON public.special_dates
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_id
    AND p.consultant_id = get_current_team_member_id()
  )
);