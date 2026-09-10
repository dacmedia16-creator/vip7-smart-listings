CREATE OR REPLACE FUNCTION public.preencher_endereco_condominios()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  WITH ranked AS (
    SELECT codigo_condominio_imoview AS codigo,
           endereco, numero, bairro, cep, estado, cidade,
           ROW_NUMBER() OVER (PARTITION BY codigo_condominio_imoview ORDER BY COUNT(*) DESC) AS rn
    FROM public.imoveis_proprios
    WHERE codigo_condominio_imoview IS NOT NULL AND endereco IS NOT NULL AND endereco <> ''
    GROUP BY codigo_condominio_imoview, endereco, numero, bairro, cep, estado, cidade
  ), upd AS (
    UPDATE public.condominios_cache c
    SET endereco = r.endereco,
        numero = COALESCE(NULLIF(c.numero,''), r.numero),
        bairro = COALESCE(NULLIF(c.bairro,''), r.bairro),
        cep = COALESCE(NULLIF(c.cep,''), r.cep),
        estado = COALESCE(NULLIF(c.estado,''), r.estado),
        cidade = COALESCE(NULLIF(c.cidade,''), r.cidade),
        updated_at = now()
    FROM ranked r
    WHERE r.rn = 1 AND r.codigo = c.codigo
      AND (c.endereco IS NULL OR c.endereco = '')
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO _n FROM upd;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.preencher_endereco_condominios() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preencher_endereco_condominios() TO service_role;