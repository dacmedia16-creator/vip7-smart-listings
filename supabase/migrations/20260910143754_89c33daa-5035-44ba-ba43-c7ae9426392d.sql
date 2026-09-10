ALTER TABLE public.condominios_cache
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS estado text;

GRANT DELETE ON public.condominios_cache TO authenticated;

DROP POLICY IF EXISTS "Admin/gestor podem excluir condominios" ON public.condominios_cache;
CREATE POLICY "Admin/gestor podem excluir condominios"
ON public.condominios_cache
FOR DELETE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()));