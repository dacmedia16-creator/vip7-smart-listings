# Full sync Imoview com flag para desativar marcação de inativos

## Objetivo
Disparar um full sync agora, mas SEM marcar como inativo nada que não vier na rodada. Apenas inserir novos e atualizar existentes.

## Mudança no código
Arquivo: `supabase/functions/imoview-sync/index.ts`

1. Aceitar um parâmetro `skip_inactive` (boolean) no body da requisição.
2. Propagar esse parâmetro nos auto re-invokes (senão só o primeiro chunk respeita).
3. No bloco final (quando `done=true`), pular o `UPDATE ... SET ativo=false` se `skip_inactive` for `true`. Continuar setando `status` e `finished_at` normalmente.

## Disparo
Após o ajuste, invocar a edge function:
```
POST /functions/v1/imoview-sync
{ "mode": "full", "skip_inactive": true }
```

## Monitoramento
- Acompanhar `imoview_sync_log` (última linha) até `status` virar `ok` ou `partial`.
- Reportar números finais: `inserted`, `updated`, `unchanged`, `photos`, `errors`, e `removed=0` (esperado).
- Verificar nos edge function logs as contagens `detalhes.app` vs `detalhes.fallback`.

## Sem mudanças
- Sem alteração de schema, RLS, ou outras telas.
- Comportamento padrão (sem a flag) continua marcando inativos como antes.