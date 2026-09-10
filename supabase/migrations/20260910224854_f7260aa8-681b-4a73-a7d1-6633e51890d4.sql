CREATE OR REPLACE FUNCTION public.preencher_fotos_condominios()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  WITH expandido AS (
    SELECT i.codigo_condominio_imoview AS codigo,
           i.codigo_imoview,
           f.ord,
           replace(split_part(f.foto->>'url', '?', 1), 'http://', 'https://') AS url
    FROM public.imoveis_proprios i
    CROSS JOIN LATERAL jsonb_array_elements(i.imoview_raw->'fotos') WITH ORDINALITY AS f(foto, ord)
    WHERE i.imoview_raw ? 'fotos'
      AND i.codigo_condominio_imoview IS NOT NULL
      AND COALESCE((f.foto->>'condominio')::boolean, false) = true
      AND COALESCE(f.foto->>'url', '') <> ''
  ), unicos AS (
    SELECT DISTINCT ON (codigo, url) codigo, url, codigo_imoview, ord
    FROM expandido
    ORDER BY codigo, url, codigo_imoview, ord
  ), ordenados AS (
    SELECT codigo, url,
           ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY codigo_imoview, ord) AS rn
    FROM unicos
  ), agregado AS (
    SELECT codigo, array_agg(url ORDER BY rn) AS fotos
    FROM ordenados
    WHERE rn <= 30
    GROUP BY codigo
  ), upd AS (
    UPDATE public.condominios_cache c
    SET fotos = a.fotos,
        updated_at = now()
    FROM agregado a
    WHERE a.codigo = c.codigo
      AND COALESCE(array_length(c.fotos, 1), 0) = 0
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO _n FROM upd;
  RETURN _n;
END;
$$;