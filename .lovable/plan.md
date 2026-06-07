Ao acessar a tela de Imóveis no CRM, a listagem deve iniciar já filtrada para mostrar apenas imóveis **Disponíveis** com finalidade **Venda**.

### Mudanças

1. **Objeto `EMPTY` em `src/crm/pages/Imoveis.tsx`**
   - Alterar `finalidade` de `'todos'` para `'venda'`.
   - `status` já está `'disponivel'` (feito anteriormente).

2. **Ajustar contagem de filtros ativos (`activeCount`)**
   - Garantir que os defaults (`status: 'disponivel'`, `finalidade: 'venda'`) **não** sejam contados como filtros ativos, evitando que o badge de filtros apareça na carga inicial.

3. **Botão "Limpar"**
   - Ao clicar em Limpar, restaurar para os defaults (`disponivel` + `venda`), não para `'todos'` em ambos.

Nenhuma alteração de banco de dados, RLS ou backend é necessária.