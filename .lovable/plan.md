## Problema

Os imóveis importados do Imoview não têm **complemento**, **número** nem **bloco/torre** — apesar de esses campos existirem no payload bruto da API (confirmei que `imoview_raw` contém `complemento`, `numero` e `bloco` preenchidos).

Causa: a função `supabase/functions/imoview-sync/index.ts` (linhas 281-319) só mapeia `endereco`, `bairro`, `cidade`, etc. — os campos `complemento`, `numero` e `bloco` são ignorados na sincronização.

## Correção

### 1. Atualizar o sync do Imoview
Em `supabase/functions/imoview-sync/index.ts`, dentro do `payload` retornado por `mapProperty`, adicionar:

```ts
numero: (raw.numero as string) || null,
complemento: (raw.complemento as string) || null,
torre_bloco: (raw.bloco as string) || null,
```

Assim, todas as próximas execuções de sync preencherão esses campos.

### 2. Backfill dos imóveis já importados
Rodar uma migration de dados (via insert tool) que, para todos os registros com `origem='imoview'` e `imoview_raw` presente, copia os campos do JSON bruto para as colunas correspondentes — só sobrescreve quando a coluna atual está nula/vazia, para não perder edições manuais:

```sql
UPDATE public.imoveis_proprios
SET
  numero      = COALESCE(NULLIF(numero,''),      imoview_raw->>'numero'),
  complemento = COALESCE(NULLIF(complemento,''), imoview_raw->>'complemento'),
  torre_bloco = COALESCE(NULLIF(torre_bloco,''), imoview_raw->>'bloco')
WHERE origem = 'imoview'
  AND imoview_raw IS NOT NULL;
```

## Verificação

- Abrir o CRM em um imóvel importado → aba Endereço mostra Número, Complemento e Torre/Bloco preenchidos.
- Próximas sincronizações Imoview trazem esses campos automaticamente.
