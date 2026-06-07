# Corrigir sync: nenhum imóvel foi inserido apesar de 1213 lidos

## Diagnóstico

Logs da edge function `imoview-sync` mostram que as 60 páginas foram lidas com sucesso (`fin=2 pag=1..56` + `fin=1 pag=1..6`, total 1213 itens), mas:

- `inserted=0, updated=0, unchanged=0, photos=0, errors=0`
- Nenhum log `[sync] detalhes ... falhou` apareceu.

Isso significa que `fetchDetails` **nunca foi chamado**. No código de `imoview-sync/index.ts`:

```ts
const codigos = lista.map((it) => Number(it.codigo)).filter(Boolean);
```

A lista da API `/Imovel/RetornarImoveisDisponiveis` provavelmente não devolve o código sob a chave `codigo` (a `imoview-api` já trata variações como `codigofinalidade`, `codigocondominio`, etc.). Como todos os `Number(it.codigo)` viram `NaN`, `codigos` fica vazio, nenhum detalhe é buscado e `syncOne` nunca executa — o cursor avança normalmente e o log fecha com `ok`.

## Correção

1. **`supabase/functions/imoview-sync/index.ts`** — leitura tolerante do código do imóvel:
   ```ts
   const pickCodigo = (it: Record<string, unknown>): number => {
     const v = it.codigo ?? it.codigoimovel ?? it.codigoImovel
            ?? it.codigoImovelDisponivel ?? it.id;
     const n = Number(v);
     return Number.isFinite(n) && n > 0 ? n : 0;
   };
   const codigos = lista.map(pickCodigo).filter(Boolean);
   if (codigos.length === 0 && lista.length > 0) {
     console.warn(`[sync] sem codigo em ${lista.length} itens. Keys:`,
       Object.keys(lista[0]).sort().join(','));
   }
   ```
   Mesma mudança em `mapToRow` para `codigo_imoview`.

2. **Limpeza do log anterior** (manual via SQL ou ignorar — não há registros para apagar).

3. **Reexecutar** "Sincronização completa" em `/crm/configuracoes/imoview` e validar:
   - `select count(*) from imoveis_proprios` > 0
   - `select inserted, photos_uploaded from imoview_sync_log order by started_at desc limit 1`

4. Se ainda vier 0, o `console.warn` revelará as chaves reais e farei outro passe.

## Após sync OK

Validar via browser:
- `/` (Home) — seções "Destaques Venda" e "Destaques Locação" populadas.
- `/imoveis` — listagem, paginação, filtros (cidade, tipo, finalidade, faixa de preço).
- `/imovel/:codigo` — detalhe abre, fotos carregam do bucket `imoveis-fotos`.
- `/comparar` — adicionar 2 imóveis e comparar.
- Network: confirmar **zero** chamadas para `functions/v1/imoview-api` no fluxo público.

## Fora de escopo

- Mudanças de UI/tema.
- Cron de sync automática.
- Remoção da função `imoview-api`.
