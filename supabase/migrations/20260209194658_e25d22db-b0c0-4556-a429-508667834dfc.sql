-- Restrict system_settings SELECT to admins only
DROP POLICY "Authenticated users can read settings" ON public.system_settings;

CREATE POLICY "Only admins can read settings"
ON public.system_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));