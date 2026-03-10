

## Corrigir ordenação por Menor R$/m² colocando imóveis sem dados no final

### Problema

Ao ordenar por "Menor R$/m²", imóveis sem área (onde o cálculo de R$/m² retorna 0) aparecem primeiro, empurrando os imóveis com valores reais para páginas posteriores. Isso faz parecer que a página 2 tem valores menores que a página 1.

### Causa

A função `calcPrecoM2` retorna `0` quando o imóvel não tem dados de área. Na ordenação crescente, `0` vem antes de qualquer valor positivo, então imóveis sem informação de R$/m² ocupam as primeiras posições.

### Solução

**Arquivo: `src/pages/Imoveis.tsx` (linhas 355-360)**

Alterar a ordenação por R$/m² para:
1. Filtrar imóveis com R$/m² = 0 para o final da lista (não têm dados suficientes)
2. Ordenar normalmente apenas os imóveis com valor válido de R$/m²

A lógica do sort será ajustada para que, quando `calcPrecoM2` retornar 0, o imóvel seja posicionado no final (tanto para `menor_m2` quanto para `maior_m2`):

```typescript
if (ordenar === 'menor_m2') {
  return [...arr].sort((a, b) => {
    const am2 = calcPrecoM2(a);
    const bm2 = calcPrecoM2(b);
    if (am2 <= 0 && bm2 <= 0) return 0;
    if (am2 <= 0) return 1;  // a vai pro final
    if (bm2 <= 0) return -1; // b vai pro final
    return am2 - bm2;
  });
}
```

A mesma lógica será aplicada para `maior_m2`.

### Detalhes Técnicos

A alteração é apenas na função `applyOrdering` dentro do `useMemo` de `filteredProperties`. Imóveis com R$/m² = 0 (sem área cadastrada) serão sempre posicionados no final da lista, independente da direção da ordenação. Isso garante que a página 1 mostre os imóveis com os menores (ou maiores) valores reais de R$/m².

