## Paginação real na lista de Leads (`/crm/leads`)

Hoje a página tem `.limit(200)` fixo, por isso só mostra 200. Vou trocar por paginação real de **20 por página**.

### Mudanças em `src/crm/pages/Leads.tsx`

1. Adicionar estados `page` (default 1) e `totalCount`.
2. Trocar a query por uma com contagem e range:
   - `supabase.from('leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page-1)*20, page*20 - 1)`
   - Manter os mesmos filtros (status, origem, busca).
3. Resetar `page` para 1 sempre que filtros ou busca mudarem.
4. Mostrar no cabeçalho: "Mostrando X–Y de N leads".
5. Adicionar controles de paginação no rodapé da tabela:
   - Botões "Anterior" / "Próxima"
   - Indicador "Página X de Y" (Y = `Math.ceil(totalCount/20)`)
   - Desabilitar botões nos extremos
6. Manter o spinner de loading durante a troca de página.

### Não muda
- Layout, colunas da tabela, filtros e ações existentes.
- Nenhuma outra página do CRM.
