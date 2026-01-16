
-- Remover políticas atuais da tabela clients
DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;

-- Criar novas políticas restritas à área comercial
CREATE POLICY "Comercial area users can read clients"
  ON public.clients FOR SELECT
  USING (user_has_area(auth.uid(), 'comercial'::functional_area));

CREATE POLICY "Comercial area users can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (user_has_area(auth.uid(), 'comercial'::functional_area));

CREATE POLICY "Comercial area users can update clients"
  ON public.clients FOR UPDATE
  USING (user_has_area(auth.uid(), 'comercial'::functional_area));

CREATE POLICY "Comercial area users can delete clients"
  ON public.clients FOR DELETE
  USING (user_has_area(auth.uid(), 'comercial'::functional_area));

-- Aplicar mesma restrição à tabela client_interactions
DROP POLICY IF EXISTS "Authenticated users can read interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Authenticated users can insert interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Authenticated users can update interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Authenticated users can delete interactions" ON public.client_interactions;

CREATE POLICY "Comercial area users can read interactions"
  ON public.client_interactions FOR SELECT
  USING (user_has_area(auth.uid(), 'comercial'::functional_area));

CREATE POLICY "Comercial area users can insert interactions"
  ON public.client_interactions FOR INSERT
  WITH CHECK (user_has_area(auth.uid(), 'comercial'::functional_area));

CREATE POLICY "Comercial area users can update interactions"
  ON public.client_interactions FOR UPDATE
  USING (user_has_area(auth.uid(), 'comercial'::functional_area));

CREATE POLICY "Comercial area users can delete interactions"
  ON public.client_interactions FOR DELETE
  USING (user_has_area(auth.uid(), 'comercial'::functional_area));
