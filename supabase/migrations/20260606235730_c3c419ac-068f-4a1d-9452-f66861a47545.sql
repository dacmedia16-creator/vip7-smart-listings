
-- 1. Estender imoveis_proprios
ALTER TABLE public.imoveis_proprios
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'proprio',
  ADD COLUMN IF NOT EXISTS codigo_imoview integer,
  ADD COLUMN IF NOT EXISTS imoview_raw jsonb,
  ADD COLUMN IF NOT EXISTS imoview_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS imoview_hash text,
  ADD COLUMN IF NOT EXISTS condominio_nome text,
  ADD COLUMN IF NOT EXISTS aceita_permuta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_m2 numeric,
  ADD COLUMN IF NOT EXISTS data_atualizacao_origem timestamptz;

ALTER TABLE public.imoveis_proprios
  ADD CONSTRAINT imoveis_origem_chk CHECK (origem IN ('proprio','imoview'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_imoveis_codigo_imoview
  ON public.imoveis_proprios (codigo_imoview)
  WHERE codigo_imoview IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_imoveis_origem_status
  ON public.imoveis_proprios (origem, status, ativo);
CREATE INDEX IF NOT EXISTS idx_imoveis_preco
  ON public.imoveis_proprios (preco);
CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_bairro
  ON public.imoveis_proprios (cidade, bairro);
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo_finalidade
  ON public.imoveis_proprios (tipo, finalidade);
CREATE INDEX IF NOT EXISTS idx_imoveis_search
  ON public.imoveis_proprios
  USING gin (to_tsvector('portuguese',
    coalesce(titulo,'') || ' ' ||
    coalesce(descricao,'') || ' ' ||
    coalesce(bairro,'') || ' ' ||
    coalesce(cidade,'') || ' ' ||
    coalesce(condominio_nome,'')));

-- 2. Tabela imoview_sync_log
CREATE TABLE IF NOT EXISTS public.imoview_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  mode text NOT NULL DEFAULT 'full',
  total integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  unchanged integer NOT NULL DEFAULT 0,
  removed integer NOT NULL DEFAULT 0,
  photos_uploaded integer NOT NULL DEFAULT 0,
  errors_count integer NOT NULL DEFAULT 0,
  triggered_by uuid,
  cursor jsonb,
  error_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT imoview_sync_status_chk CHECK (status IN ('running','ok','partial','error'))
);

GRANT SELECT ON public.imoview_sync_log TO authenticated;
GRANT ALL ON public.imoview_sync_log TO service_role;

ALTER TABLE public.imoview_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imoview_sync_log_read_admin"
  ON public.imoview_sync_log FOR SELECT
  TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

CREATE TRIGGER trg_imoview_sync_log_updated
  BEFORE UPDATE ON public.imoview_sync_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Storage: leitura pública das fotos do bucket imoveis-fotos
DROP POLICY IF EXISTS "imoveis_fotos_public_read" ON storage.objects;
CREATE POLICY "imoveis_fotos_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'imoveis-fotos');

-- 4. Permitir service_role escrever (já tem por default, mas garantir)
DROP POLICY IF EXISTS "imoveis_fotos_service_write" ON storage.objects;
CREATE POLICY "imoveis_fotos_service_write"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'imoveis-fotos')
  WITH CHECK (bucket_id = 'imoveis-fotos');
