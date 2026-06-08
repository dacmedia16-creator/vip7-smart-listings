# Teste da IA WhatsApp — sem repetição

## Objetivo
Validar em produção que, após o fix do loop, a IA processa cada mensagem do cliente **uma única vez** e responde sem repetir o "⏳ Um momento...".

## Passos

1. **Resetar o lead de teste** (telefone 15981788214 — lead `54aff7e6-d735-40f8-aa88-378c3787fa04` que está aberto na tela):
   - `ia_handoff = false`
   - `ia_handoff_at = null`
   - `ia_handoff_motivo = null`
   - `ia_last_message_at = null` (libera o rate-limit de 5s)

2. **Limpar dedupe recente** (opcional, só por segurança): apagar mensagens role='user' com content='ola' do lead nos últimos 5 minutos, pra `ola` voltar a ser processada como nova.

3. **Pedir que o usuário envie** uma mensagem real no WhatsApp pro número conectado (ex.: `ola, quero ver o imóvel`).

4. **Monitorar `edge_function_logs` de `ia-whatsapp-inbound`** logo após o envio. Critérios de sucesso:
   - 1 linha `[ia-inbound] payload:` por mensagem do cliente (retries da ZionTalk são OK se aparecerem, mas devem cair em `skip: mensagem duplicada recente` ou `skip rate-limit`).
   - 1 envio de `⏳ Um momento...` por mensagem (não 5 como antes).
   - 1 linha final `[ia-inbound] ok lead=... phone=...` com a resposta gerada.
   - Sem linhas de `[ia-inbound] error`.

5. **Conferir na tela do lead** (`/crm/leads/54aff7e6...`) que o `InteracaoTimeline` mostra: 1 mensagem do usuário, 1 "aguarde" e 1 resposta da IA — sem duplicatas.

## Critério de falha
Se aparecer mais de 1 envio de "aguarde" no WhatsApp ou mais de 1 resposta final para a mesma mensagem do cliente, abrir os logs e investigar (provavelmente um caminho de retry escapou da dedupe ou a ZionTalk está chamando o webhook por mais de um canal).

## Detalhes técnicos
- Reset feito via `supabase--insert` (UPDATE na tabela `leads`) com filtro `id = '54aff7e6-d735-40f8-aa88-378c3787fa04'`.
- A limpeza de `ia_conversas` (opcional) usa migration, já que delete não está disponível via insert direto. Se preferir, pulamos e só esperamos os 30s passarem.
- Nenhuma alteração de código: a correção do loop já está deployada (background processing + dedupe forte + rate-limit 5s).
