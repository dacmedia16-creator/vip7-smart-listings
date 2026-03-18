

## Corrigir contagem de imóveis à venda (922 vs 1036)

### Problema

A página `/imoveis` mostra **922 imóveis** em vez de **1036**. O motivo: por padrão, ela usa o endpoint `RetornarImoveisAlterados` (imóveis alterados nos últimos 365 dias), que **exclui imóveis que não foram modificados há mais de 1 ano**. O total correto vem do endpoint `RetornarImoveisDisponiveis`, que retorna **todos** os imóveis disponíveis.

### Solução

Usar o endpoint `RetornarImoveisDisponiveis` (via `listarImoveis`) como fonte principal de dados na página de listagem, mesmo na ordenação "mais recentes". A ordenação por data de atualização já é feita no lado do servidor.

### Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Imoveis.tsx` | Remover a lógica `useRecentesEndpoint` — sempre usar `useImoveis` (que chama `listarImoveis` / `RetornarImoveisDisponiveis`). A ordenação por "mais recentes" será tratada pelo parâmetro `ordenarPor: 'data_desc'` já suportado |
| `src/services/imoviewApi.ts` | Garantir que o `ordenarPor: 'data_desc'` é enviado corretamente ao backend para ordenação por data |
| `supabase/functions/imoview-api/index.ts` | Verificar/adicionar suporte ao parâmetro de ordenação por data no endpoint `listarImoveis` (se necessário via `ordenacao` na API Imoview) |

### Detalhes Técnicos

- `RetornarImoveisAlterados` (endpoint atual padrão): retorna apenas imóveis modificados dentro de um período — causa contagem incorreta
- `RetornarImoveisDisponiveis` (endpoint correto): retorna todos os imóveis disponíveis com paginação nativa e contagem precisa
- A página já usa `useImoveis` como fallback quando há filtros avançados — basta torná-lo o padrão sempre
- O hook `useImoveisRecentes` continuará existindo para a seção de destaques na homepage (onde faz sentido mostrar apenas recentes)

