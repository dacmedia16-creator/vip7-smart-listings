
ALTER TABLE public.imoveis_proprios ADD COLUMN IF NOT EXISTS codigo_condominio_imoview integer;
CREATE INDEX IF NOT EXISTS idx_imoveis_codigo_condominio_imoview ON public.imoveis_proprios(codigo_condominio_imoview);
CREATE INDEX IF NOT EXISTS idx_condominios_cache_nome ON public.condominios_cache(nome);
CREATE INDEX IF NOT EXISTS idx_condominios_cache_cidade ON public.condominios_cache(cidade);

UPDATE public.imoveis_proprios
   SET codigo_condominio_imoview = NULLIF(imoview_raw->>'codigocondominio','')::int
 WHERE imoview_raw ? 'codigocondominio'
   AND codigo_condominio_imoview IS NULL;
