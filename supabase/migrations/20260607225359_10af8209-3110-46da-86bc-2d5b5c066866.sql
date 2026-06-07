
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS imoveis_carrinho_codigos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS imoveis_visita_codigos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS imoveis_proposta_codigos text[] NOT NULL DEFAULT '{}';

-- Backfill from observacoes text
UPDATE public.leads SET
  imoveis_carrinho_codigos = COALESCE((
    SELECT array_agg(DISTINCT m[1])
    FROM regexp_matches(
      COALESCE((regexp_match(observacoes, 'Imóveis carrinho:\s*([^|]+)'))[1], ''),
      '(\d+)', 'g'
    ) AS m
  ), '{}'),
  imoveis_visita_codigos = COALESCE((
    SELECT array_agg(DISTINCT m[1])
    FROM regexp_matches(
      COALESCE((regexp_match(observacoes, 'Imóveis visita:\s*([^|]+)'))[1], ''),
      '(\d+)', 'g'
    ) AS m
  ), '{}'),
  imoveis_proposta_codigos = COALESCE((
    SELECT array_agg(DISTINCT m[1])
    FROM regexp_matches(
      COALESCE((regexp_match(observacoes, 'Imóveis proposta:\s*([^|]+)'))[1], ''),
      '(\d+)', 'g'
    ) AS m
  ), '{}')
WHERE observacoes IS NOT NULL
  AND observacoes ~ 'Imóveis (carrinho|visita|proposta):';
