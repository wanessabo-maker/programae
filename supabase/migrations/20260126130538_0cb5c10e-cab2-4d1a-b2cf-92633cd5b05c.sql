-- =============================================
-- STRICTER RLS FOR COMMERCIAL USERS
-- Users can only see their OWN clients/projects/contracts
-- =============================================

-- 1. CLIENTS TABLE - Restrict to creator only (not responsible)
DROP POLICY IF EXISTS "Users can read own clients or admin" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients or admin" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients or admin" ON public.clients;

-- SELECT: Only creator can see their clients (not responsible)
CREATE POLICY "Users can read own clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  (user_has_area(auth.uid(), 'comercial'::functional_area) AND created_by = get_current_team_member_id())
  OR
  (user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area) AND created_by = get_current_team_member_id())
);

-- UPDATE: Only creator can update their clients
CREATE POLICY "Users can update own clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  (user_has_area(auth.uid(), 'comercial'::functional_area) AND created_by = get_current_team_member_id())
);

-- DELETE: Only creator can delete their clients
CREATE POLICY "Users can delete own clients"
ON public.clients
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  (user_has_area(auth.uid(), 'comercial'::functional_area) AND created_by = get_current_team_member_id())
);

-- 2. PROJECTS TABLE - Restrict to creator only
DROP POLICY IF EXISTS "Authenticated users can read projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

-- SELECT: Users see only projects they created
CREATE POLICY "Users can read own projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  created_by = get_current_team_member_id()
  OR
  -- CS/AT users need to see projects for their cases
  (user_has_area(auth.uid(), 'customer_success'::functional_area))
  OR
  (user_has_area(auth.uid(), 'assistencia_tecnica'::functional_area))
);

-- UPDATE: Only creator can update
CREATE POLICY "Users can update own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  created_by = get_current_team_member_id()
);

-- DELETE: Only creator can delete
CREATE POLICY "Users can delete own projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  created_by = get_current_team_member_id()
);

-- 3. CLIENT INTERACTIONS - Align with new clients policy
DROP POLICY IF EXISTS "Users can read own client interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Users can insert own client interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Users can update own client interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Users can delete own client interactions" ON public.client_interactions;

-- Interactions follow the client creator rule
CREATE POLICY "Users can read client interactions"
ON public.client_interactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_interactions.client_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR c.created_by = get_current_team_member_id()
    )
  )
);

CREATE POLICY "Users can insert client interactions"
ON public.client_interactions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_interactions.client_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR c.created_by = get_current_team_member_id()
    )
  )
);

CREATE POLICY "Users can update client interactions"
ON public.client_interactions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_interactions.client_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR c.created_by = get_current_team_member_id()
    )
  )
);

CREATE POLICY "Users can delete client interactions"
ON public.client_interactions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_interactions.client_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR c.created_by = get_current_team_member_id()
    )
  )
);