

## Corrigir contagem de imóveis — limite de 1000

O problema está na edge function `imoview-api`, na action `listarImoveisRecentes`. A paginação paralela está configurada com:

- `PAGE_SIZE = 50` (máximo da API)
- `MAX_PAGES = 20` → limite de **1000 imóveis** (20 × 50)

Como agora existem **1036 imóveis**, os últimos 36 estão sendo cortados.

### Alteração

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/imoview-api/index.ts` | Aumentar `MAX_PAGES` de 20 para 30 (suporta até 1500 imóveis) |

Uma única linha alterada. Isso resolve a contagem e garante margem para crescimento.

