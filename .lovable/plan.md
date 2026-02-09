

## Plano: Adicionar Filtro de Preco por Metro Quadrado (R$/m2)

### Objetivo

Adicionar dois campos de filtro (minimo e maximo) para preco por metro quadrado na pagina de listagem de imoveis. O calculo sera: `valor / area` (usando areaTotal ou areaConstruida).

### Como Funciona

O filtro sera **100% client-side** (calculado no navegador), pois a API Imoview nao suporta esse tipo de filtro. O valor por m2 sera calculado para cada imovel retornado e comparado com os limites definidos pelo usuario.

### Alteracoes Necessarias

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Imoveis.tsx` | 1. Ler novos parametros `precoM2Min` e `precoM2Max` da URL |
| `src/pages/Imoveis.tsx` | 2. Adicionar filtro client-side nos `filteredProperties` e `filteredMapProperties` |
| `src/pages/Imoveis.tsx` | 3. Adicionar UI com dois campos de input (min/max R$/m2) na sidebar de filtros |
| `src/pages/Imoveis.tsx` | 4. Incluir no `hasAdvancedFilters` para correta deteccao de filtros ativos |
| `src/pages/Imoveis.tsx` | 5. Limpar valores no `clearFilters` |

### Posicao na Interface

O novo filtro sera adicionado **logo apos a Faixa de Preco** existente (linha 1000), mantendo a ordem logica dos filtros:

1. Busca
2. Finalidade
3. Tipo
4. Cidades
5. Bairros
6. Condominios
7. Quartos
8. Banheiros
9. Area Minima
10. Faixa de Preco
11. **Preco por m2** (NOVO)

### Detalhes Tecnicos

**Parametros de URL:**
- `precoM2Min` - Valor minimo de R$/m2 (ex: `precoM2Min=5000`)
- `precoM2Max` - Valor maximo de R$/m2 (ex: `precoM2Max=15000`)

**Calculo do preco por m2:**
```typescript
const area = property.areaTotal || property.areaConstruida || 0;
const precoM2 = area > 0 && property.valor ? property.valor / area : 0;
```

**Filtro client-side (adicionado em `filteredProperties` e `filteredMapProperties`):**
```typescript
if (precoM2MinUrl || precoM2MaxUrl) {
  const minM2 = precoM2MinUrl ? Number(precoM2MinUrl) : 0;
  const maxM2 = precoM2MaxUrl ? Number(precoM2MaxUrl) : Infinity;
  list = list.filter((property) => {
    const area = property.areaTotal || property.areaConstruida || 0;
    if (area <= 0 || !property.valor) return false; // Excluir imoveis sem area ou valor
    const precoM2 = property.valor / area;
    return precoM2 >= minM2 && precoM2 <= maxM2;
  });
}
```

**UI dos campos (seguindo o padrao existente da Faixa de Preco):**
- Titulo: "Preco por m2"
- Icone: Ruler (ja importado)
- Dois inputs lado a lado: "Min R$/m2" e "Max R$/m2"
- Formatacao numerica com separador de milhares
- Aplicacao do filtro no `onBlur` (mesmo padrao do filtro de preco)

**Inclusao no `hasAdvancedFilters`:**
```typescript
precoM2MinUrl !== '' ||
precoM2MaxUrl !== ''
```

### Interface Visual

```text
+---------------------------+
| Preco por m2              |
+---------------------------+
| R$/m2  |      | R$/m2     |
| Min    |  -   | Max       |
| [_____]|      | [________]|
+---------------------------+
```

### Resultado Esperado

- Usuario pode filtrar imoveis por faixa de preco por metro quadrado
- Imoveis sem area cadastrada serao excluidos quando o filtro estiver ativo
- Filtro funciona em conjunto com todos os outros filtros existentes
- Valores persistem na URL para compartilhamento
- Botao "Limpar Filtros" reseta os valores

