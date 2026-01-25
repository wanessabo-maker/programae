-- Drop existing overly permissive policies on credit_transactions
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.credit_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.credit_transactions;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.credit_transactions;

-- Keep read access for all authenticated users
-- (policy "Authenticated users can read" already exists and is fine)

-- Create new policies that restrict write operations to admins or own consultant
CREATE POLICY "Users can insert own transactions or admin"
ON public.credit_transactions
FOR INSERT
WITH CHECK (
  (consultant_id = get_current_team_member_id()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update own transactions or admin"
ON public.credit_transactions
FOR UPDATE
USING (
  (consultant_id = get_current_team_member_id()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can delete own transactions or admin"
ON public.credit_transactions
FOR DELETE
USING (
  (consultant_id = get_current_team_member_id()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);