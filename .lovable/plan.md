
## Plano: Corrigir Filtro de Casa de Condomínio

### Diagnostico

Identifiquei a causa raiz do problema:

O mapeamento do tipo "Casa de Condomínio" para código numérico está **inconsistente** entre dois arquivos:

| Arquivo | Mapeamento | Status |
|---------|------------|--------|
| `src/pages/Imoveis.tsx` linha 207 | `casa_condominio: 5` | ERRADO |
| `src/services/imoviewApi.ts` linha 204 | `casa_condominio: [28]` | CORRETO |

O código **28** é o valor correto para "Casa de Condomínio" na API Imoview (não 5).

### Impacto

Quando o usuário seleciona tipo "Casa de Condomínio":
1. O filtro `recentesFilters` é construído com `codigoTipo: tipoParaCodigo(tipo)` 
2. A função `tipoParaCodigo` retorna **5** (incorreto) em vez de **28**
3. A API Imoview não encontra imóveis com codigoTipo=5 nos condomínios selecionados
4. Resultado: 0 imóveis

### Solucao

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Imoveis.tsx` | Corrigir mapeamento `casa_condominio` de `5` para `28` na função `tipoParaCodigo` (linha 207) |

### Codigo Corrigido

```typescript
// Mapeamento de tipo (texto) para código numérico da API
const tipoParaCodigo = (tipoStr?: string): number | undefined => {
  if (!tipoStr) return undefined;
  const tipoLower = tipoStr.toLowerCase();
  // Mapeamento baseado nos tipos comuns da API Imoview
  const mapa: Record<string, number> = {
    'casa': 1,
    'apartamento': 2,
    'terreno': 19,        // Corrigido: 3 -> 19
    'comercial': 6,       // Corrigido: 4 -> 6
    'casa_condominio': 28, // CORRIGIDO: 5 -> 28
  };
  return mapa[tipoLower];
};
```

### Observacoes Adicionais

Os códigos para terreno e comercial também podem estar incorretos:
- Terreno: API usa código 19 (não 3)
- Comercial: API usa código 6 (não 4)

Esses valores devem ser validados com base no mapeamento existente em `imoviewApi.ts`:
- `terreno: [19, 4]` - usar 19 como principal
- `comercial: [6, 8, 11, 23, 26]` - usar 6 como principal

### Resultado Esperado

Após a correção:
- Filtro "Casa de Condomínio" + Condomínios Alphaville retornará os imóveis corretamente
- A contagem exibida corresponderá ao número real de casas de condomínio disponíveis nos condomínios selecionados
