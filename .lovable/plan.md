

## Plano: Corrigir Valores de R$/m2

### Problema Identificado

Os valores de R$/m2 estao errados porque:

1. A API Imoview ja fornece um campo `valorm2` pre-calculado, mas ele e **ignorado** pelo sistema
2. O calculo manual no frontend usa a **area errada** - prefere `areaTotal` (area do lote/terreno) em vez de `areaConstruida` (area construida)

**Exemplo do problema:** Um imovel com lote de 500m2 e area construida de 200m2, avaliado em R$ 1.000.000:
- Calculo atual (errado): R$ 1.000.000 / 500 = **R$ 2.000/m2**
- Calculo correto: R$ 1.000.000 / 200 = **R$ 5.000/m2**
- Valor da API (`valorm2`): **R$ 5.000/m2** (correto)

### Solucao

Usar o campo `valorm2` fornecido pela API Imoview. Quando nao disponivel, calcular usando `areaConstruida` (area construida) como prioridade, e somente usar `areaTotal` (area do lote) como fallback.

### Alteracoes Necessarias

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/imoview-api/index.ts` | Incluir `valorm2` no mapeamento de propriedades |
| `src/services/imoviewApi.ts` | Adicionar campo `valorM2` no tipo `ImoviewProperty` |
| `src/components/PropertyCard.tsx` | Usar `valorM2` da API; fallback com `areaConstruida` primeiro |
| `src/pages/Imoveis.tsx` | Corrigir todas as 6 ocorrencias do calculo de R$/m2 |

### Detalhes Tecnicos

**1. Edge Function (`supabase/functions/imoview-api/index.ts`)**

Adicionar ao mapeamento na funcao `mapImoviewProperty`:
```typescript
valorM2: parseCurrencyValue(raw.valorm2) || undefined,
```

**2. Tipo ImoviewProperty (`src/services/imoviewApi.ts`)**

Adicionar campo:
```typescript
valorM2?: number; // Valor por m2 calculado pela API Imoview
```

**3. PropertyCard (`src/components/PropertyCard.tsx`)**

Corrigir calculo do `precoM2Info`:
```typescript
const precoM2Info = React.useMemo(() => {
  // Preferir valor da API (mais preciso)
  if (property.valorM2 && property.valorM2 > 0) {
    const precoM2 = property.valorM2;
    const abaixoDaMedia = mediaPrecoM2Bairro != null && mediaPrecoM2Bairro > 0 && precoM2 < mediaPrecoM2Bairro;
    const percentAbaixo = abaixoDaMedia ? Math.round((1 - precoM2 / mediaPrecoM2Bairro) * 100) : 0;
    return { precoM2, abaixoDaMedia, percentAbaixo };
  }
  // Fallback: calcular com areaConstruida como prioridade
  const area = property.areaConstruida || property.areaTotal || 0;
  if (area <= 0 || !property.valor) return null;
  const precoM2 = property.valor / area;
  // ...resto igual
}, [...]);
```

**4. Imoveis.tsx - Corrigir 6 locais**

Em todos os calculos de R$/m2, inverter a ordem de prioridade da area E usar `valorM2` quando disponivel:

- `calcPrecoM2` (funcao de ordenacao)
- `filteredProperties` (filtro de R$/m2)
- `mediasPrecoM2PorBairro` (calculo da media do bairro)
- `filteredMapProperties` (filtro de R$/m2 no mapa)
- `calcPrecoM2Map` (ordenacao no mapa)

Padrao corrigido para todos:
```typescript
// Preferir valorM2 da API, senao calcular com areaConstruida como prioridade
const getPrecoM2 = (p) => {
  if (p.valorM2 && p.valorM2 > 0) return p.valorM2;
  const area = p.areaConstruida || p.areaTotal || 0;
  return area > 0 && p.valor ? p.valor / area : 0;
};
```

### Resultado Esperado

- Valores de R$/m2 corretos nos cards dos imoveis
- Badge "abaixo da media do bairro" com percentuais corretos
- Filtro de R$/m2 funcionando com valores precisos
- Ordenacao por R$/m2 com valores corretos
- Consistencia entre o que a imobiliaria anuncia e o que o site exibe

