-- Fix technical_assistance table: Replace overly permissive policies with proper access control
-- Only assistencia_tecnica area users, assigned responsible, attended_by staff, and admins should have access

-- First drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can read AT" ON public.technical_assistance;
DROP POLICY IF EXISTS "Authenticated users can insert AT" ON public.technical_assistance;
DROP POLICY IF EXISTS "Authenticated users can update AT" ON public.technical_assistance;
DROP POLICY IF EXISTS "Authenticated users can delete AT" ON public.technical_assistance;

-- Create proper SELECT policy: admin, AT area users, responsible, or attended_by
CREATE POLICY "AT area users and assigned staff can read AT"
ON public.technical_assistance
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
  OR responsible_id = get_current_team_member_id()
  OR attended_by = get_current_team_member_id()
);

-- Create proper INSERT policy: admin or AT area users can create cases
CREATE POLICY "AT area users can insert AT"
ON public.technical_assistance
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
);

-- Create proper UPDATE policy: admin, AT area users, or assigned staff
CREATE POLICY "AT area users and assigned staff can update AT"
ON public.technical_assistance
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
  OR responsible_id = get_current_team_member_id()
  OR attended_by = get_current_team_member_id()
);

-- Create proper DELETE policy: only admin or AT area users can delete
CREATE POLICY "AT area users can delete AT"
ON public.technical_assistance
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
);