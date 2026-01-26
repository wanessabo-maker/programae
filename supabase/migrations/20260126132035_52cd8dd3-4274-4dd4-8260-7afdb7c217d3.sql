-- =============================================
-- RESTRICT customer_success TABLE TO CS/AT AREAS AND ADMINS
-- =============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can read CS" ON public.customer_success;
DROP POLICY IF EXISTS "Authenticated users can insert CS" ON public.customer_success;
DROP POLICY IF EXISTS "Authenticated users can update CS" ON public.customer_success;
DROP POLICY IF EXISTS "Authenticated users can delete CS" ON public.customer_success;

-- SELECT: Only CS area, AT area, or admin users can read
CREATE POLICY "CS and AT users can read customer_success"
ON public.customer_success
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
);

-- INSERT: Only CS area, AT area, or admin users can insert
CREATE POLICY "CS and AT users can insert customer_success"
ON public.customer_success
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
);

-- UPDATE: Only CS area, AT area, or admin users can update
CREATE POLICY "CS and AT users can update customer_success"
ON public.customer_success
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
);

-- DELETE: Only CS area, AT area, or admin users can delete
CREATE POLICY "CS and AT users can delete customer_success"
ON public.customer_success
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_has_area(auth.uid(), 'customer_success'::functional_area)
  OR user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area)
);