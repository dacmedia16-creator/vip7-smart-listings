# Ordenação na lista de imóveis do CRM

## Objetivo
Adicionar um seletor de ordenação na barra de filtros da página **Imóveis** do CRM (`src/crm/pages/Imoveis.tsx`), permitindo escolher: **Mais recentes** (padrão), **Mais antigos**, **Menor valor**, **Maior valor** e **Título A–Z**.

Hoje a lista é fixa em `created_at DESC` (linha 179), sem opção de mudar a ordem.

## Como
A paginação é server-side (`range(from, to)`), então a ordenação precisa ser server-side também — trocar o `.order('created_at', …)` por um `.order()` baseado no estado `ordenacao`.

### Mudanças em `src/crm/pages/Imoveis.tsx`
1. **Novo estado** `ordenacao` (`'recentes' | 'antigos' | 'menor_valor' | 'maior_valor' | 'titulo'`), default `'recentes'`.
2. **Persistir** em `sessionStorage` (`crm-imoveis-state`): incluir `ordenacao` no `SavedState`, em `loadSavedState` e no `saveSavedState`.
3. **Aplicar** na query (substituir a linha 179):
   - `recentes` → `.order('created_at', { ascending: false })`
   - `antigos` → `.order('created_at', { ascending: true })`
   - `menor_valor` → `.order('preco', { ascending: true })`
   - `maior_valor` → `.order('preco', { ascending: false })`
   - `titulo` → `.order('titulo', { ascending: true })`
4. **Incluir `ordenacao`** no array de dependências do `useEffect` da query.
5. **UI**: adicionar um `<Select>` (shadcn, igual aos filtros) na barra de filtros (Card das linhas 348–360), ao lado do botão "Filtros".

## Validação
- Build OK (verificar `/tmp/observability/build-errors.log`).
- Trocar a ordenação no preview e confirmar que a lista reordena e a paginação continua funcionando.
