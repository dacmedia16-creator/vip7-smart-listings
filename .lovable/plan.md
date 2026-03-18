

## Corrigir contagem ao ordenar por R$/m² — limite de 1000

### Problema

O hook `useImoveisMap` (usado para ordenação R$/m² e filtros avançados) tem `PAGE_SIZE = 20` e `MAX_PAGES = 50`, resultando em no máximo **1000 imóveis** (20 × 50). Com 1036 imóveis disponíveis, 36 ficam de fora.

### Alteração

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useImoveisMap.ts` | Aumentar `MAX_PAGES` de 50 para 75 (suporta até 1500 imóveis, mesma margem da edge function) |

Uma única linha alterada.

