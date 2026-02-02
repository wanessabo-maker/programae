-- Fix actions table: Remove overly permissive policies that bypass ownership checks
-- PostgreSQL RLS uses OR logic - if ANY policy grants access, operation is allowed
-- The "Authenticated users can X" policies bypass the ownership checks

DROP POLICY IF EXISTS "Authenticated users can delete" ON public.actions;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.actions;
DROP POLICY IF EXISTS "Authenticated users can read" ON public.actions;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.actions;

-- Fix special_dates table: Remove duplicate permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.special_dates;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.special_dates;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.special_dates;

-- Keep the proper ownership policies that already exist:
-- actions: "Users can X own actions or admin" policies
-- special_dates: "Consultant or admin can X special dates" policies