

## Corrigir contagem e paginação com filtros client-side (quartos, banheiros, área)

### Problema

Quando o usuário filtra por quartos, banheiros ou área mínima, a API Imoview **não suporta** esses filtros nativamente. O sistema aplica esses filtros apenas nos 20 resultados da página atual, mas mostra o total da API (244 imóveis). Resultado: "244 encontrados", mas só 1 imóvel aparece por página — a paginação fica quebrada.

A API suporta `numeroquartos` via `dormitorios`, mas **não suporta** filtro por banheiros nem por área mínima. E o frontend envia `quartos`/`banheiros`/`areaMin` nos params, mas a edge function não mapeia esses campos para a API.

### Solução

Quando qualquer filtro client-side está ativo (quartos, banheiros, areaMin, precoM2), buscar TODOS os imóveis (reutilizando `useImoveisMap`) e paginar no cliente — mesma abordagem já usada para ordenação por R$/m².

### Alterações

**Arquivo: `src/pages/Imoveis.tsx`**

1. Criar flag `hasClientSideFilters` que detecta quando quartos, banheiros, areaMin ou precoM2 estão ativos
2. Alterar a condição do `useImoveisMap` de `viewMode === 'map' || isM2Sort` para `viewMode === 'map' || isM2Sort || hasClientSideFilters`
3. Alterar o `sourceList` no `filteredProperties` para usar `mapProperties` quando `hasClientSideFilters` está ativo
4. Alterar o cálculo de `properties` e `totalImoveis` para paginar no cliente quando `hasClientSideFilters`
5. Ajustar `isLoading` para usar `isLoadingMap` quando `hasClientSideFilters`

Essencialmente, expandir a mesma lógica de `isM2Sort` para incluir `hasClientSideFilters`.

**Alternativa complementar (edge function)**: mapear `quartos` → `dormitorios` na edge function para que a API filtre nativamente quando possível. Mas banheiros e área não são suportados pela API, então o client-side é necessário de qualquer forma.

### Impacto

- Quando filtros client-side estão ativos, o sistema carrega todos os imóveis (já em cache de 30min)
- A contagem e paginação refletirão os dados reais filtrados
- Performance: reutiliza o cache existente do `useImoveisMap`

