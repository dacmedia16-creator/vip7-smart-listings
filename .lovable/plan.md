

## Corrigir ordenação por R$/m² para considerar todos os imóveis

### Problema

Quando o usuário ordena por "Menor R$/m²" ou "Maior R$/m²", a ordenação só é aplicada nos 20 imóveis da página atual. Isso acontece porque a API não suporta ordenação por R$/m², então o sistema busca apenas uma página (20 itens) e ordena localmente — resultando em uma ordenação incorreta e incompleta.

### Solução

Quando a ordenação por R$/m² estiver ativa, buscar TODOS os imóveis (usando o mesmo mecanismo do mapa) e aplicar ordenação + paginação no cliente.

### Alterações

**Arquivo: `src/pages/Imoveis.tsx`**

1. **Detectar quando ordenação por R$/m² está ativa**: criar flag `isM2Sort = ordenar === 'menor_m2' || ordenar === 'maior_m2'`

2. **Ativar o hook `useImoveisMap`** quando `isM2Sort` é true (mesmo na visualização de lista). Atualmente ele só é ativado quando `viewMode === 'map'`. Mudar para: `enabled: viewMode === 'map' || isM2Sort`

3. **Quando `isM2Sort` está ativo**, usar os dados do `useImoveisMap` (todos os imóveis) em vez dos dados paginados:
   - Aplicar os mesmos filtros locais (tipo, quartos, banheiros, área, busca, preço m²)
   - Ordenar todos por R$/m²
   - Paginar no cliente (slice do array)
   - Atualizar `totalImoveis` e `totalPages` baseado no total filtrado

4. **Atualizar `filteredProperties`** e `totalImoveis` para usar a fonte de dados correta conforme o modo de ordenação

### Detalhes Técnicos

O hook `useImoveisMap` já busca todos os imóveis em paralelo com batches de 15 páginas. Quando ativado para ordenação por R$/m², ele carrega todos os imóveis em cache (30min staleTime), aplica os filtros e ordenação no cliente, e faz paginação manual via `slice()`. Isso garante que o "Menor R$/m²" compare todos os imóveis disponíveis, não apenas os 20 da página atual.

O `isLoading` também será ajustado para refletir o carregamento correto quando usar este modo.

