## Mostrar Descrição junto do Título nos cards de listagem

Hoje, em `src/crm/pages/Imoveis.tsx` (linhas 466–474), cada card mostra:

```
código · tipo
Título
bairro, cidade
preço          quartos · área
```

A Descrição não aparece. Vou adicioná-la imediatamente abaixo do Título, para refletir o agrupamento que acabamos de fazer no formulário.

### Mudança

No bloco do card (linha ~468), após o `<h3>` do título, adicionar:

```tsx
{im.descricao && (
  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
    {im.descricao}
  </p>
)}
```

- `line-clamp-2` para limitar a 2 linhas e manter o card compacto.
- Só renderiza quando há descrição.
- Usa o campo `descricao` já carregado pelo `select('*')` (linha 138).

### Sem alterações

- Query, paginação, filtros, ações do card.
- Demais campos exibidos (código, tipo, bairro, cidade, preço, quartos, área) permanecem iguais.
