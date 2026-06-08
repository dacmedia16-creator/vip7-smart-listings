
# Atendente IA WhatsApp (ZionTalk) — Implementação

Implementação completa em 3 fases. Fase 1 já roda sozinha; Fase 2 fica "armada" esperando você confirmar o webhook com a ZionTalk.

## Migration (uma SQL única)

- **Tabela `ia_conversas`** — id, lead_id (FK leads, cascade), role (system/user/assistant/tool), content, imovel_codigo, created_at, updated_at. Índices em `(lead_id, created_at desc)` e `(lead_id, imovel_codigo)`. RLS: SELECT pra `is_crm_user`. GRANTs pra `authenticated` (select/insert) e `service_role` (all).
- **Colunas em `leads`**: `ia_handoff bool default false`, `ia_handoff_at`, `ia_handoff_motivo text`, `ia_last_message_at timestamptz`.
- **Defaults em `app_config`**: `ia_whatsapp_enabled=false`, `ia_whatsapp_persona`, `ia_whatsapp_handoff_keywords`, `ia_whatsapp_truncate_chars=600`.
- **Trigger `disparar_ia_whatsapp()`** AFTER INSERT em `leads`. Usa `pg_net.http_post` (extension habilitada) com URL hardcoded do projeto e timeout 5s. Skip se telefone < 10 dígitos. Só dispara quando `ia_whatsapp_enabled='true'` (lido dentro da função).

## Edge Function `ia-whatsapp-greeting`

`verify_jwt = false` (chamada pelo trigger via pg_net sem JWT de usuário).

1. Recebe `{lead_id}`, valida.
2. Carrega lead. Se `imovel_interesse_codigo` existe, busca imóvel por `codigo_imoview` (numérico). Tolera ausência.
3. Skip se já existe interação tipo `whatsapp_ia` pro lead (idempotência).
4. Skip se `app_config.ia_whatsapp_enabled != 'true'`.
5. Chama **Lovable AI Gateway** (`google/gemini-3-flash-preview`) com persona + dados do imóvel + link `https://vipsevenimoveis.com.br/imovel/{codigo}`. Pede saudação 2-3 linhas.
6. Envia via helper `enviarWhatsApp()` (com retry 2x backoff exponencial).
7. Grava 2 linhas em `ia_conversas` (system + assistant) com `imovel_codigo`.
8. Grava em `lead_interacoes` (tipo `outro` — o enum atual não tem `whatsapp_ia`, usamos `outro` + prefixo `[IA WhatsApp]` no descricao).
9. Atualiza `leads.ia_last_message_at`.

## Edge Function `ia-whatsapp-inbound`

`verify_jwt = false`. Autenticação via **Bearer header** (`Authorization: Bearer <ZIONTALK_INBOUND_TOKEN>`). Sem token configurado = modo aberto com aviso (mesmo padrão do `portal-lead-grupozap`).

Fluxo:
1. Parse `{phone, message}` (ajustável quando souber o payload real da ZionTalk).
2. `normalizarTelefone()` — só dígitos, strip `55`.
3. Acha lead mais recente pelo telefone (últimos 90 dias). Não achou → 200 skip.
4. Se `ia_handoff = true` → skip.
5. **Rate limit**: se `ia_last_message_at` < 2s → 200 skip.
6. **Resposta imediata**: dispara "⏳ Um momento, consultando os imóveis..." em paralelo (não bloqueia).
7. **Fallback rápido por keyword** (lido de `app_config.ia_whatsapp_handoff_keywords`) — se bater, pula classificação por IA e vai pra handoff.
8. Senão, **classifica intent** com Gemini (`temperature: 0`, prompt restritivo, retry 2x).
9. Se intent ∈ {`agendar_visita`, `falar_humano`}: marca handoff, responde "Perfeito! Já chamei o corretor...", cria tarefa pro `corretor_id` (ou notifica admin se não tem) via `notifyHandoff()`.
10. Senão: carrega últimas 20 trocas de `ia_conversas` filtradas por `imovel_codigo` do lead (contexto por imóvel). Monta mensagens + persona. Chama Gemini com tools (`buscar_imoveis`, `detalhes_imovel`, `pedir_handoff`).
11. Loop de tool calling manual (máx 5 iterações). Executa tools no servidor (queries em `imoveis_proprios`), devolve resultados ao modelo.
12. Trunca resposta final ao limite configurado e envia via ZionTalk.
13. Grava user+assistant em `ia_conversas`, atualiza `ia_last_message_at`.

## Shared helpers `supabase/functions/_shared/ia.ts`

- `normalizarTelefone(tel)` — `.replace(/\D/g,"").replace(/^55/,"")`.
- `comRetry(fn, max=2, label)` — backoff exponencial com `console.error` estruturado.
- `enviarWhatsApp(phoneBR, msg)` — Basic Auth ZionTalk, retry embutido. Telefone no formato `+55{phoneBR}`.
- `callLovableAI(messages, opts)` — POST pra `https://ai.gateway.lovable.dev/v1/chat/completions` com header `Authorization: Bearer ${LOVABLE_API_KEY}`. Trata 429 (rate limit) e 402 (créditos) com log claro. Suporta `tools` e parsing de `tool_calls`.
- `classificarIntencao(msg)` — usa `callLovableAI` com prompt fixo.
- `buscarImoveis(filtros)` — query em `imoveis_proprios` (ativo=true, status disponivel), retorna até 5 com título/preço/cidade/bairro/quartos/link.

## Config (`supabase/config.toml`)

```toml
[functions.ia-whatsapp-greeting]
verify_jwt = false

[functions.ia-whatsapp-inbound]
verify_jwt = false
```

## UI no CRM

### `Configuracoes.tsx` — nova aba **"Atendente IA"**
- Switch global (`ia_whatsapp_enabled`).
- Textarea Persona (salva onBlur).
- Input Keywords handoff (salva onBlur).
- Bloco "Webhook ZionTalk":
  - URL: `https://qozlwzgesezsygmnuzky.supabase.co/functions/v1/ia-whatsapp-inbound`
  - Badge status do token: 🟡 Sem token / 🟢 Protegido (lido via GET na própria function como no `portal-lead-grupozap`)
  - Instrução: "No painel ZionTalk, configure o header `Authorization: Bearer <token>`"
- Métricas últimos 7 dias: total mensagens IA, intents classificados, handoffs.

### `LeadDetail.tsx` — nova aba **"Conversa IA"**
- Componente `InteracaoIA` (novo): timeline de bolhas (user direita / assistant esquerda), agrupada por dia. Poll a cada 3s.
- Badge no header do lead: 🤖 IA atendendo / 👤 Em handoff.
- Botão "Assumir conversa" (AlertDialog) → seta `ia_handoff=true` + motivo "Corretor assumiu manualmente".
- Botão "Reativar IA" (só admin/gestor) → limpa handoff.

## Logging estruturado

Todos os logs com prefixo `[ia-greeting]`, `[ia-inbound]`, `[intent]`, `[handoff]`, `[rate-limit]`, `[ziontalk-send]`, `[gemini-tools]` pra facilitar grep.

## Secrets

| Nome | Status |
|---|---|
| `ZIONTALK_API_KEY` | ✅ já existe |
| `LOVABLE_API_KEY` | ✅ já existe |
| `ZIONTALK_INBOUND_TOKEN` | 🆕 opcional — peço quando você quiser proteger a Fase 2 |

## Arquivos criados/editados

- `supabase/migrations/<ts>_ia_whatsapp.sql` (novo)
- `supabase/functions/_shared/ia.ts` (novo)
- `supabase/functions/ia-whatsapp-greeting/index.ts` (novo)
- `supabase/functions/ia-whatsapp-inbound/index.ts` (novo)
- `supabase/config.toml` (2 blocos novos)
- `src/crm/pages/Configuracoes.tsx` (nova aba)
- `src/crm/pages/LeadDetail.tsx` (nova aba)
- `src/crm/components/InteracaoIA.tsx` (novo)

## Notas técnicas importantes

- **Uso Lovable AI Gateway diretamente via fetch** (não SDK), porque edge functions Deno têm restrições com alguns pacotes npm. Modelo padrão `google/gemini-3-flash-preview` (grátis até início de 2026).
- **Não uso `@google/generative-ai`** — pra não depender de SDK externo + ter custos via Lovable AI Gateway transparentes.
- **`pg_net` extension** precisa estar habilitada — confirmo na migration com `CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions`.
- **Tipo `lead_interacoes.tipo`** é enum sem `whatsapp_ia` — uso `outro` + prefixo no `descricao`. Se quiser, em outra rodada eu adiciono o valor ao enum.
- **Tipos `tarefas`** (`tipo`, `prioridade`, `status`) seguem o que já existe no schema.

## Fora de escopo (v1)

- Áudio/imagem do cliente.
- Múltiplas linhas WhatsApp.
- Agendamento automático no Google Calendar.
- Dashboard analítico avançado (só métricas básicas em Configurações).

## Próximos passos

1. ✅ Aprovar plano.
2. Eu implemento tudo (Fase 1 + Fase 2 + UI).
3. Você liga o switch em **Configurações → Atendente IA** quando quiser começar a disparar a 1ª mensagem.
4. Você fala com o suporte ZionTalk pra configurar o webhook deles apontando pro `ia-whatsapp-inbound` com Bearer token.
5. Se o payload da ZionTalk for diferente do esperado (`{phone, message}`), você me passa um exemplo real e eu ajusto o parser em 2 minutos.
