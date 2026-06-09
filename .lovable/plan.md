## Causa

O handoff do Denis foi gravado corretamente (`ia_handoff = true`, motivo "Cliente quer agendar visita") e o trigger `disparar_handoff_notify` chamou a edge function `notify-handoff` — mas a resposta foi **401 Unauthorized** (confirmado em `net._http_response` id 201, 23:56:50).

Motivo: o trigger envia o header `x-internal-secret` com o valor de `app_config.cron_secret`, mas `notify-handoff` valida contra a env `CRON_SECRET`. Os dois valores estão diferentes. A função `cron-notifications` já trata isso aceitando os dois (app_config primeiro, env como fallback) — `notify-handoff` só olha a env.

## Correção

Atualizar `supabase/functions/notify-handoff/index.ts` para seguir o mesmo padrão de `cron-notifications`:

1. Buscar `app_config.cron_secret` no início (com service role).
2. Comparar `x-internal-secret` contra `app_config.cron_secret` **ou** contra `Deno.env.get("CRON_SECRET")`. Aceita qualquer um dos dois.
3. Resto da função (carga do lead, enriquecimento, envio ZionTalk para Eder) permanece igual.

Depois disso, qualquer novo handoff dispara a mensagem para Eder normalmente.

## Reenvio do handoff do Denis

Para não perder o handoff que já aconteceu (Denis pediu visita), após o deploy chamamos `notify-handoff` manualmente uma vez com `lead_id = 3fcd9863-01d2-42ac-8860-d44d6c9b3614` para o Eder receber a mensagem agora.

## Fora de escopo

- Rotacionar/sincronizar a secret `CRON_SECRET` com `app_config.cron_secret` (a correção acima já elimina a necessidade).
- Mudanças no trigger ou na UI.
