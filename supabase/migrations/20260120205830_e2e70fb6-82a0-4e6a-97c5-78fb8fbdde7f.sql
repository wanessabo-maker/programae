-- Drop overly permissive policies that don't include ownership checks
DROP POLICY IF EXISTS "Comercial area users can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Comercial area users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Comercial area users can read clients" ON public.clients;
DROP POLICY IF EXISTS "Comercial area users can update clients" ON public.clients;

DROP POLICY IF EXISTS "Comercial area users can delete interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Comercial area users can insert interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Comercial area users can read interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Comercial area users can update interactions" ON public.client_interactions;

-- The restrictive policies with ownership checks remain:
-- "Users can read own clients or admin" - requires comercial area + (created_by OR responsible_id) OR admin
-- "Users can insert own clients" - requires comercial area + created_by OR admin
-- "Users can update own clients or admin" - requires comercial area + (created_by OR responsible_id) OR admin
-- "Users can delete own clients or admin" - requires comercial area + (created_by OR responsible_id) OR admin

-- Same for client_interactions - restrictive policies with ownership inheritance remain