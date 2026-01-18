-- =====================================================
-- SECURITY FIX: Implement user-specific access controls
-- =====================================================

-- Drop existing overly permissive policies on 'actions' table
DROP POLICY IF EXISTS "Authenticated users can read " ON public.actions;
DROP POLICY IF EXISTS "Authenticated users can insert " ON public.actions;
DROP POLICY IF EXISTS "Authenticated users can update " ON public.actions;
DROP POLICY IF EXISTS "Authenticated users can delete " ON public.actions;

-- Create new restrictive policies for 'actions' table
-- Users can only see their own actions (by consultant_id) or if they're admin
CREATE POLICY "Users can read own actions or admin"
ON public.actions
FOR SELECT
USING (
  consultant_id = get_current_team_member_id() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can only insert actions where they are the consultant
CREATE POLICY "Users can insert own actions"
ON public.actions
FOR INSERT
WITH CHECK (
  consultant_id = get_current_team_member_id()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can only update their own actions
CREATE POLICY "Users can update own actions or admin"
ON public.actions
FOR UPDATE
USING (
  consultant_id = get_current_team_member_id()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can only delete their own actions
CREATE POLICY "Users can delete own actions or admin"
ON public.actions
FOR DELETE
USING (
  consultant_id = get_current_team_member_id()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- Drop existing overly permissive policies on 'clients' table
-- =====================================================
DROP POLICY IF EXISTS "Comercial area users can read clients " ON public.clients;
DROP POLICY IF EXISTS "Comercial area users can insert clients " ON public.clients;
DROP POLICY IF EXISTS "Comercial area users can update clients " ON public.clients;
DROP POLICY IF EXISTS "Comercial area users can delete clients " ON public.clients;

-- Create new restrictive policies for 'clients' table
-- Users must have comercial area access AND be creator/responsible or be admin
CREATE POLICY "Users can read own clients or admin"
ON public.clients
FOR SELECT
USING (
  (
    user_has_area(auth.uid(), 'comercial'::functional_area)
    AND (
      created_by = get_current_team_member_id()
      OR responsible_id = get_current_team_member_id()
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can insert clients if they have comercial access and set themselves as creator
CREATE POLICY "Users can insert own clients"
ON public.clients
FOR INSERT
WITH CHECK (
  (
    user_has_area(auth.uid(), 'comercial'::functional_area)
    AND created_by = get_current_team_member_id()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can update their own clients (created_by or responsible_id)
CREATE POLICY "Users can update own clients or admin"
ON public.clients
FOR UPDATE
USING (
  (
    user_has_area(auth.uid(), 'comercial'::functional_area)
    AND (
      created_by = get_current_team_member_id()
      OR responsible_id = get_current_team_member_id()
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can delete their own clients
CREATE POLICY "Users can delete own clients or admin"
ON public.clients
FOR DELETE
USING (
  (
    user_has_area(auth.uid(), 'comercial'::functional_area)
    AND (
      created_by = get_current_team_member_id()
      OR responsible_id = get_current_team_member_id()
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- Also update client_interactions to follow same pattern
-- =====================================================
DROP POLICY IF EXISTS "Comercial area users can read interactions " ON public.client_interactions;
DROP POLICY IF EXISTS "Comercial area users can insert interactions " ON public.client_interactions;
DROP POLICY IF EXISTS "Comercial area users can update interactions " ON public.client_interactions;
DROP POLICY IF EXISTS "Comercial area users can delete interactions " ON public.client_interactions;

-- Users can read interactions for clients they have access to
CREATE POLICY "Users can read own client interactions"
ON public.client_interactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_interactions.client_id
    AND (
      (
        user_has_area(auth.uid(), 'comercial'::functional_area)
        AND (c.created_by = get_current_team_member_id() OR c.responsible_id = get_current_team_member_id())
      )
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Users can insert interactions for clients they have access to
CREATE POLICY "Users can insert own client interactions"
ON public.client_interactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_interactions.client_id
    AND (
      (
        user_has_area(auth.uid(), 'comercial'::functional_area)
        AND (c.created_by = get_current_team_member_id() OR c.responsible_id = get_current_team_member_id())
      )
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Users can update interactions for clients they have access to
CREATE POLICY "Users can update own client interactions"
ON public.client_interactions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_interactions.client_id
    AND (
      (
        user_has_area(auth.uid(), 'comercial'::functional_area)
        AND (c.created_by = get_current_team_member_id() OR c.responsible_id = get_current_team_member_id())
      )
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Users can delete interactions for clients they have access to
CREATE POLICY "Users can delete own client interactions"
ON public.client_interactions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_interactions.client_id
    AND (
      (
        user_has_area(auth.uid(), 'comercial'::functional_area)
        AND (c.created_by = get_current_team_member_id() OR c.responsible_id = get_current_team_member_id())
      )
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);