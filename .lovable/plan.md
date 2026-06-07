# Migração de leitura: Imoview API → Supabase (`imoveis_proprios`)

Após a primeira sincronização (já implementada via `imoview-sync`), o front público deixa de chamar a edge function `imoview-api` e passa a ler direto do banco. A `imoveis_proprios` já tem RLS pública para registros ativos/disponíveis.

## Estratégia: adapter, sem quebrar UI

Criar `src/services/imoveisDb.ts` que **expõe a mesma assinatura** de `imoviewApi.ts` (`ImoviewProperty`, `ImoviewFilters`, `listarImoveis`, `detalhesImovel`, `listarCidades`, `listarBairros`, `listarTiposImoveis`, `listarImoveisRecentes`, `listarCondominios` etc.), mapeando linhas do banco para o shape `ImoviewProperty`. Assim os 14 consumidores não precisam mudar — só trocam o import.

Mapeamento DB → ImoviewProperty:
- `codigo_imoview` → `codigo` (fallback hash do `id` quando `origem='proprio'`)
- `preco` → `valor`; `condominio` → `valorCondominio`; `iptu` → `valorIptu`
- `area`/`area_total` → `areaConstruida`/`areaTotal`
- `quartos/suites/vagas/banheiros` → `qtde*`
- `fotos[]` (text[]) → `[{ url }]`
- `tipo`, `finalidade` ('venda'|'aluguel'|'venda_aluguel') → `finalidade` numérico (2/1) + `tipo` string
- `caracteristicas`, `latitude/longitude`, `condominio_nome`, `valor_m2`, `aceita_permuta`, `data_atualizacao_origem` → campos correspondentes

## Funções implementadas

1. **`listarImoveis(filters)`** — query no Supabase com:
   - `.eq('ativo', true)`, `.in('status', ['disponivel','sob_proposta'])`
   - finalidade: 1→`'aluguel'`/`'venda_aluguel'`, 2→`'venda'`/`'venda_aluguel'`
   - tipo: `.ilike('tipo', ...)` (resolver código→nome via tabela estática)
   - cidades/bairros: `.in('cidade', cidades)` + `.in('bairro', bairros)` normalizados
   - condomínio: `.in('condominio_nome', ...)`
   - faixa de valor, dorms, suítes, vagas, destaque
   - busca textual (se houver): `.textSearch` no índice GIN já criado
   - ordenação (`ordenarPor`: recentes, menor/maior preço, menor/maior R$/m²)
   - paginação `.range()` com `count: 'exact'` → retorna `{ lista, quantidade }`

2. **`detalhesImovel(codigo)`** — `.eq('codigo_imoview', codigo).maybeSingle()`.

3. **`listarCidades(finalidade)` / `listarBairros(...)` / `listarTiposImoveis()`** — `select distinct` agregando do próprio `imoveis_proprios` filtrado por finalidade/cidade. Resultado memoizado client-side (já há `FILTER_CACHE_CONFIG`).

4. **`listarCondominios*`** — distinct em `condominio_nome` agrupado por cidade (substitui `condominios_cache` para o caminho público; cache continua existindo como fallback).

5. **`listarImoveisRecentes`** — mesma query de `listarImoveis` ordenada por `data_atualizacao_origem desc` filtrando `>= now() - intervalo`.

## Swap nos consumidores

Trocar o import em:
- `src/hooks/useImoveis.ts`, `useImoveisMap.ts`, `useFiltrosIniciais.ts`, `usePropertyGeocodes.ts`, `useCompare.ts`
- `src/components/FeaturedPropertiesSection.tsx`, `PropertyCard.tsx`, `PropertyJsonLd.tsx`, `PropertyMap.tsx`, `HeroSection.tsx`, `CompareDrawer.tsx`
- `src/pages/Imoveis.tsx`, `ImovelDetail.tsx`, `Comparar.tsx`

De: `from '@/services/imoviewApi'` → `from '@/services/imoveisDb'`.

`useFiltrosIniciais` deixa de invocar a edge function `imoview-api` e chama `listarCidades` + `listarTiposImoveis` em paralelo.

`useImoveisMap` deixa de paginar em lotes (DB devolve tudo numa query só com `.limit(2000)` + `.not('latitude','is',null)`).

## Edge functions

- `imoview-api`: mantida só como fallback admin (não removida).
- `sync-condominios`: mantida (já popula `condominios_cache`).

## Fora de escopo

- Alterações no CRM (continua usando o banco).
- Remoção do `imoview-api` ou do `condominios_cache`.
- Mudanças visuais.
- Sincronização automática/cron.

## Riscos / mitigações

- **Antes da primeira sync o site fica vazio** → manter `imoview-api` ativa; criar flag `VITE_USE_DB_IMOVEIS` (default `true`) em `imoveisDb.ts` para reverter rápido caso necessário, delegando ao `imoviewApi.ts` quando `false`.
- **Códigos `codigo_imoview` ausentes** em imóveis `origem='proprio'` → adapter gera código sintético estável a partir do UUID para URLs (`/imovel/:codigo`); `ImovelDetail` busca por `codigo_imoview` OR `id`.
- **Performance de distinct cidade/bairro** → criar índices btree em `(cidade)`, `(bairro)`, `(condominio_nome)` se ainda não existirem (migração curta).

## Validação

1. Rodar sync full em `/crm/configuracoes/imoview`.
2. Conferir Home, `/imoveis` (filtros, paginação, mapa), `/imovel/:codigo`, `/comparar`.
3. Verificar Network: nenhuma chamada para `functions/v1/imoview-api` no fluxo público.
