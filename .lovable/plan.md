
## Diagnóstico

A API Imoview desta conta **não expõe** `RetornarImoveis` nem `RetornarImoveisInativos` (ambos 404). Só responde os endpoints `*Disponiveis*` — confirmado tanto em `imoview-api/index.ts` quanto nos logs (`23:30:51 ERROR fatal: 404`). Portanto, **não há como "listar" imóveis inativos via API**. O modo `desativados` atual tenta 3 endpoints inexistentes e crasha antes de gravar status, deixando o log fantasma como `running` (igual ao caso anterior).

## Solução

Trocar a estratégia do modo `desativados` de "listar inativos da API" para **reconciliação**:
1. Listar todos os códigos atualmente disponíveis na Imoview (paginando `RetornarImoveisDisponiveis` para Venda e Aluguel) — sem buscar detalhes.
2. Marcar como inativos no banco (`ativo=false`, `status='inativo'`) todos os `imoveis_proprios` com `origem='imoview'` cujo `codigo_imoview` NÃO estiver no conjunto retornado.

Isso é mais barato (sem `RetornarDetalhes`), confiável, e usa só endpoints que funcionam.

## Passo a passo

### 1. Destravar o log preso `a15f54aa-ada1-45a4-9be4-c8026f52cc13`
`UPDATE imoview_sync_log` → `status='error'`, `finished_at=now()`, `error_details={"reason":"endpoints RetornarImoveis/Inativos retornam 404","fixed_in":"reescrita do modo desativados"}`. Libera os botões da UI imediatamente.

### 2. Reescrever `supabase/functions/imoview-sync/index.ts` — modo `desativados`

- Remover `fetchListingDesativados` (que chama endpoints inexistentes).
- Adicionar nova função `collectAvailableCodes(finalidade)` que pagina `RetornarImoveisDisponiveis` apenas extraindo `codigo` (sem fetch de detalhes).
- No handler, quando `mode === 'desativados'`, executar fluxo separado em vez do loop normal:
  1. Coletar códigos de Venda + Aluguel.
  2. `SELECT id, codigo_imoview FROM imoveis_proprios WHERE origem='imoview' AND ativo=true`.
  3. Calcular diff: códigos no banco que **não estão** no conjunto da API.
  4. Update em lote: `ativo=false, status='inativo', imoview_sync_at=now()` nos IDs do diff.
  5. Atualizar `imoview_sync_log` com `total` (códigos vistos na API), `removed` (quantos marcados inativos), `status='ok'`, `finished_at=now()`.
- Como esse modo é leve (só listagem + 1 update), roda numa única invocação — sem self-invoke/chunks. Se o volume passar de ~6000 códigos, paginar a coleta com persistência intermediária de cursor.

### 3. Validação
Após deploy, disparar manualmente o modo `desativados` pela UI e conferir em `imoview_sync_log`: `status='ok'`, `finished_at` preenchido, `total > 0`, `removed >= 0`, `errors_count = 0`.

## Fora de escopo
- Modos `full`, `incremental` e `single` permanecem inalterados.
- Nenhuma mudança de schema, RLS ou UI.
