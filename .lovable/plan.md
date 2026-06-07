## Contexto
Atualmente, ao abrir a página `/crm/imoveis`, o filtro de status vem definido como "Todas", exibindo todos os imóveis independentemente do status.

## Objetivo
Sempre que o usuário abrir a página de Imóveis, a listagem deve vir filtrada para mostrar **apenas imóveis com status "disponível"** por padrão.

## Mudanças necessárias
1. **`src/crm/pages/Imoveis.tsx`**
   - Alterar o valor padrão do filtro `status` no objeto `EMPTY` de `'todos'` para `'disponivel'`.
   - Verificar que o status `"disponivel"` corresponde ao valor esperado no banco de dados (já confirmado no enum `imovel_status` e na lógica de filtro existente).
   - Garantir que o `<Select>` de "Situação" reflita corretamente o valor pré-selecionado ao montar o componente.

## Impacto
- O filtro de status começará selecionado em "Disponível" ao invés de "Todas".
- A query Supabase aplicará `eq('status', 'disponivel')` automaticamente no primeiro carregamento.
- O contador de filtros ativos (`activeCount`) já considerará esse filtro inicial.
- O usuário ainda poderá manualmente alterar o select para "Todas" ou outro status quando desejar.

## Escopo
- Apenas frontend, arquivo único (`src/crm/pages/Imoveis.tsx`).
- Nenhuma mudança no banco de dados, RLS ou backend necessária.