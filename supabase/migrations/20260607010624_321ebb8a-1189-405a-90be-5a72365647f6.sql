
-- 1) app_config: adicionar políticas explícitas (admin manage, service_role full)
CREATE POLICY app_config_admin_manage ON public.app_config
  FOR ALL TO authenticated
  USING (is_admin_or_gestor(auth.uid()))
  WITH CHECK (is_admin_or_gestor(auth.uid()));

CREATE POLICY app_config_service_role ON public.app_config
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

-- 2) leads: restringir insert público (anon) — força campos seguros
DROP POLICY IF EXISTS leads_insert_public ON public.leads;

-- anônimos: só podem inserir sem corretor/created_by e sempre como 'novo'
CREATE POLICY leads_insert_anon ON public.leads
  FOR INSERT TO anon
  WITH CHECK (
    corretor_id IS NULL
    AND created_by IS NULL
    AND status_funil = 'novo'::lead_status
  );

-- autenticados do CRM: insert sem restrição extra (admin/gestor/atendente/corretor)
CREATE POLICY leads_insert_authenticated ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (is_crm_user(auth.uid()));
