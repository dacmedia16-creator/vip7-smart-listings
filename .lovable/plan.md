## Mover campo "Título" para junto da Descrição

Hoje o campo **Título \*** fica isolado no topo da aba **Detalhes**, acima do Status. A Descrição mora lá embaixo, na sub-aba **Anúncio & SEO**. Vou juntar os dois.

### O que muda em `src/crm/pages/ImovelForm.tsx`

1. **Remover** o `FormField` do `titulo` do Card do topo da aba Detalhes (linhas 601–603). O Card passa a conter apenas o **Status**.
2. **Adicionar** o mesmo `FormField` do `titulo` dentro da sub-aba **Anúncio & SEO**, logo antes do `FormField` da `descricao` (linha 803), para que apareçam juntos:
   - Título \*  (input)
   - Descrição (textarea)
3. Manter `titulo_anuncio` (Título para anúncio) onde está, no grid de 2 colunas — é um campo diferente, usado pelo anúncio gerado por IA.

### Sem alterações

- Schema de validação (`titulo` continua obrigatório, min 3).
- Lógica de salvamento, IA, status, navegação entre etapas.
- Nenhum outro campo é movido.
