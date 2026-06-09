DROP POLICY IF EXISTS leads_insert_publico ON public.leads;

CREATE POLICY leads_insert_publico ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  origem IN ('site_contato','site_avaliacao','site_whatsapp','portal')
  AND corretor_id IS NULL
  AND created_by IS NULL
  AND (status_funil IS NULL OR status_funil = 'novo')
);