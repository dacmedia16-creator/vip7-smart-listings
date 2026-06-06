
-- imoveis-fotos: público leitura, CRM escreve
CREATE POLICY "imoveis_fotos_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'imoveis-fotos');
CREATE POLICY "imoveis_fotos_crm_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imoveis-fotos' AND public.is_crm_user(auth.uid()));
CREATE POLICY "imoveis_fotos_crm_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'imoveis-fotos' AND public.is_crm_user(auth.uid()));
CREATE POLICY "imoveis_fotos_crm_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'imoveis-fotos' AND public.is_crm_user(auth.uid()));

-- lead-documentos: somente CRM
CREATE POLICY "lead_docs_crm_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'lead-documentos' AND public.is_crm_user(auth.uid()))
  WITH CHECK (bucket_id = 'lead-documentos' AND public.is_crm_user(auth.uid()));
