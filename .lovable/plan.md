

## Plano: Adicionar Ordenacao por Preco por Metro Quadrado (R$/m2)

### Objetivo

Adicionar duas novas opcoes de ordenacao na listagem de imoveis: "Menor R$/m2" e "Maior R$/m2". Isso permite ao usuario ordenar os resultados pelo valor por metro quadrado calculado.

### Alteracoes Necessarias

Todas as alteracoes serao no arquivo `src/pages/Imoveis.tsx`:

| Local | Alteracao |
|-------|-----------|
| Dropdown de ordenacao (linha 661-665) | Adicionar 2 novos `SelectItem`: "Menor R$/m2" e "Maior R$/m2" |
| Funcao `applyOrdering` (linhas 335-344) | Adicionar logica de ordenacao por R$/m2 |
| `filteredMapProperties` (linhas 433-438) | Adicionar ordenacao por R$/m2 para propriedades do mapa |
| `useRecentesEndpoint` (linha 233) | Considerar novas opcoes de ordenacao como "nao-recentes" |
| `ordenarPor` no `apiFilters` (linha 171) | Mapear novas opcoes para fallback (data_desc) |

### Detalhes Tecnicos

**Novos valores de `ordenar` na URL:**
- `menor_m2` - Ordenar do menor para maior R$/m2
- `maior_m2` - Ordenar do maior para menor R$/m2

**Calculo para ordenacao:**
```typescript
const calcPrecoM2 = (p: { valor?: number | null; areaTotal?: number | null; areaConstruida?: number | null }) => {
  const area = p.areaTotal || p.areaConstruida || 0;
  return area > 0 && p.valor ? p.valor / area : 0;
};
```

**Logica de ordenacao adicionada em `applyOrdering`:**
```typescript
if (ordenar === 'menor_m2') {
  return [...arr].sort((a, b) => calcPrecoM2(a) - calcPrecoM2(b));
}
if (ordenar === 'maior_m2') {
  return [...arr].sort((a, b) => calcPrecoM2(b) - calcPrecoM2(a));
}
```

**Dropdown atualizado:**
```text
+---------------------+
| Mais recentes       |
| Menor preco         |
| Maior preco         |
| Menor R$/m2   (NOVO)|
| Maior R$/m2   (NOVO)|
+---------------------+
```

**Endpoint de recentes vs geral:**
Quando o usuario seleciona ordenacao por R$/m2, o sistema usara o endpoint geral (nao o de recentes), pois a ordenacao e 100% client-side. Na construcao de `apiFilters.ordenarPor`, essas opcoes farao fallback para `data_desc` ja que a API nao suporta essa ordenacao.

### Resultado Esperado

- Duas novas opcoes aparecem no dropdown de ordenacao
- Imoveis sem area cadastrada (R$/m2 = 0) ficam no final da lista
- Ordenacao funciona em conjunto com todos os filtros existentes
- Funciona tanto na visualizacao em lista quanto no mapa
