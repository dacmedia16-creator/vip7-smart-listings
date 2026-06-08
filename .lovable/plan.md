## Diagnóstico

Na conversa, o cliente mandou "prontas" e recebeu **5 vezes** a mensagem "⏳ Um momento, já volto com a resposta..." e nenhuma resposta final.

Causa provável: o webhook da ZionTalk tem timeout curto (poucos segundos). A função `ia-whatsapp-inbound` faz tudo de forma síncrona antes de responder 200:
1. Classifica intenção (chamada IA)
2. Loop de até 5 iterações de tool-calling (cada iteração = 1 chamada IA + queries no banco)
3. Só depois envia a resposta final e retorna 200

Quando esse fluxo passa do timeout, a ZionTalk **reenvia o mesmo webhook**. A trava de rate-limit (2s) já existe, mas como cada retry pode chegar com vários segundos de diferença, ela não pega — e cada execução dispara mais um "aguarde". O loop de tool com Gemini também pode estar falhando silenciosamente (mensagem genérica de erro), mas o sintoma principal é o retry do webhook.

## Plano

1. **Responder 200 imediatamente** no webhook e processar a conversa em background (`EdgeRuntime.waitUntil`), para a ZionTalk parar de reenviar.
2. **Trava forte anti-duplicidade por mensagem**: antes de qualquer envio, gravar/checar um hash `{telefone + texto}` na tabela `ia_conversas` (role=user). Se já existe nos últimos ~30s, sai sem responder.
3. **Mandar o "aguarde" só uma vez** por mensagem do cliente (depois da trava acima, e não antes).
4. **Limitar o loop de tools a 3 iterações** e logar a resposta crua do Gemini quando vier vazia, pra confirmar se o problema também é IA travando.
5. **Não responder a mensagem genérica "tive um problema"** quando a IA falhar — em vez disso, registrar erro e deixar o handoff manual; evita poluir a conversa.

## Detalhes técnicos

- Mudança fica em `supabase/functions/ia-whatsapp-inbound/index.ts`.
- Sem alteração de schema; a dedupe usa a própria `ia_conversas` (role='user' + content + created_at >= now-30s + lead_id).
- A trava de rate-limit por lead (2s) continua, só sobe pra ~5s pra cobrir retries lentos.
- Nenhuma mudança em UI/CRM.
