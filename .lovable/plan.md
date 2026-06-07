## Problema

A página `/crm/imoveis` mostra "0 imóveis" mesmo com 1.213 registros no banco.

Na request real para o backend aparece:
```
preco=gte.0&preco=lte.0&condominio=gte.0&condominio=lte.0&area=gte.0&area=lte.0
```

Ou seja, o sistema está filtrando por preço/condomínio/área **iguais a zero**, o que nunca casa com nenhum imóvel.

## Causa

Em `src/crm/pages/Imoveis.tsx`, a função:

```ts
const numOrNull = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
```

Quando o campo está vazio (`""`), `Number("")` retorna `0` (não `NaN`), então o código aplica `gte 0` e `lte 0` em `preco`, `condominio` e `area`, restringindo o resultado a registros com valor exatamente 0.

## Correção

Arquivo único: `src/crm/pages/Imoveis.tsx`

1. Ajustar `numOrNull` para tratar string vazia / espaços como `null`:
   ```ts
   const numOrNull = (s: string) => {
     const t = (s ?? '').trim();
     if (!t) return null;
     const n = Number(t.replace(',', '.'));
     return Number.isFinite(n) ? n : null;
   };
   ```

Isso resolve as 6 condições (`preco_min/max`, `cond_min/max`, `area_min/max`) e os imóveis voltam a aparecer normalmente. Nenhuma outra mudança de lógica ou UI é necessária.