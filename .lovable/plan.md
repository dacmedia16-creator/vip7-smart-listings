## Diagnóstico

A sincronização **full** `c9a1e661-7e6c-44f1-8248-b7724cc6b43a` está **travada**:

- `status`: `running`
- `started_at`: 07/06 02:42 UTC (~20h44min atrás)
- `updated_at`: 07/06 03:04 UTC (sem atualizações há **~20h22min**)
- Progresso: 938/940 (1 inserido, 937 atualizados, faltam 2)
- `finished_at`: null
- `errors_count`: 0

O processo morreu silenciosamente (provavelmente timeout/shutdown da edge function logo após processar o batch). Enquanto `status='running'`, os botões de sync na UI ficam bloqueados.

## Ação

Atualizar o registro em `imoview_sync_log` para destravar:

- `status` → `error` (o check constraint não aceita `cancelled`, igual ao caso anterior)
- `finished_at` → `now()`
- `error_details` → `{"reason":"stuck - no updates for 20h, killed by timeout at 938/940"}`

## Próximos passos sugeridos (não incluídos nesta ação)

Depois de destravar, você pode rodar uma nova sync **incremental** para pegar os 2 imóveis restantes — ou full se preferir reprocessar tudo.