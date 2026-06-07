## Problema

A página `/crm/imoveis` (`src/crm/pages/Imoveis.tsx`) busca tudo com `select('*')` sem `.range()`. O PostgREST aplica o limite padrão de **1000 linhas**, por isso aparecem apenas 1000 imóveis — independente de quantos existam no banco.

Além disso, todo filtro/busca hoje é client-side (`useMemo` sobre o array carregado), então mesmo se houvesse mais registros, filtrar por status/texto continuaria limitado ao que foi baixado.

## Solução

Reescrever a listagem para usar paginação no servidor + contagem real:

1. **Contagem total**
   - `select('*', { count: 'exact', head: false })` para receber o total e exibir o número correto em "X imóveis".

2. **Paginação por intervalo**
   - Estado `pagina` (default 1) e `PAGE_SIZE = 60`.
   - `.range((pagina-1)*PAGE_SIZE, pagina*PAGE_SIZE - 1)` na query.
   - Botões "Anterior / Próxima" + indicador "Página X de N".

3. **Filtros no servidor**
   - `status` → `.eq('status', status)` quando ≠ `todos`.
   - Busca `q` (debounced ~300 ms) → `.or('titulo.ilike.%q%,codigo_interno.ilike.%q%,bairro.ilike.%q%,cidade.ilike.%q%')`.
   - Resetar `pagina = 1` quando filtros mudam.

4. **UX**
   - Skeleton/loading mantido.
   - Mostrar `{total} imóveis` (não `filtered.length`).
   - Mensagem clara quando não há resultados na página atual.

## Escopo

- Alterar somente `src/crm/pages/Imoveis.tsx`.
- Nenhuma mudança em schema, RLS, edge function ou no site público.
- Nenhuma mudança em outros módulos do CRM.
