# Notificação de handoff para Eder via WhatsApp

Sempre que um lead passar para handoff (IA para de responder e um humano precisa assumir), enviar mensagem WhatsApp para **Eder Francisco de Souza** (15 98176-7268) com nome do lead, imóvel de interesse e detalhes.

## Comportamento

Disparo automático em **todos** os caminhos que setam `ia_handoff = true`:
- IA decide transferir (`ia-whatsapp-inbound` — pedido do lead, fora de horário, falha repetida)
- Corretor assume manualmente (botão "Assumir conversa" em `InteracaoIA.tsx`)
- Qualquer UPDATE futuro que mude `ia_handoff` de false → true

Mensagem (texto WhatsApp):
```
🚨 Lead em handoff — atenção necessária

Lead: {nome} ({telefone})
Imóvel de interesse: #{codigo} — {tipo} em {bairro}/{cidade}
Finalidade: {finalidade}
Orçamento: {orcamento_max}
Motivo do handoff: {ia_handoff_motivo}

Abra no CRM: {url}/crm/leads/{id}
```

Campos ausentes aparecem como "—". Falha de envio é silenciosa (apenas log), não bloqueia o handoff.

## Detalhes técnicos

1. **Trigger no Postgres** sobre `public.leads`, AFTER UPDATE, condição `OLD.ia_handoff = false AND NEW.ia_handoff = true`. Usa `net.http_post` (mesmo padrão já em uso em `disparar_ia_whatsapp`) chamando uma nova edge function `notify-handoff` com `{ lead_id }` e header `X-Internal-Secret: CRON_SECRET`.

2. **Nova edge function `notify-handoff`** (`verify_jwt = false`, valida `X-Internal-Secret` contra `CRON_SECRET`):
   - Carrega lead completo (nome, telefone, imovel_interesse_codigo, cidade/bairro/tipo/finalidade, orcamento_max, ia_handoff_motivo).
   - Se `imovel_interesse_codigo` existir, busca `imoveis_proprios` para enriquecer (tipo/bairro/cidade/valor real do imóvel).
   - Destinatário fixo: `id = 5703f01d-c06a-4cda-9562-e136fdde7a8f` (Eder). Lê `profiles.telefone`, normaliza para E.164 (`+5515981767268`).
   - POST `https://app.ziontalk.com/api/send_message/` com `ZIONTALK_API_KEY` (mesmo formato que `send-whatsapp-ziontalk`).
   - Retorna 200 mesmo em falha de envio (loga erro) para não travar o trigger.

3. **Config**: adicionar bloco em `supabase/config.toml` para `notify-handoff` com `verify_jwt = false`.

4. **Sem alterações em UI**: `InteracaoIA.tsx` continua só dando UPDATE em `ia_handoff` — o trigger faz o resto. Mesmo vale para `ia-whatsapp-inbound`.

## Fora de escopo

- Configurar Eder como destinatário variável (hardcoded no edge function por enquanto).
- Notificar quando handoff for revertido (reativar IA).
- Email paralelo — só WhatsApp.
