# Integração de Leads — Grupo OLX (sem token ainda)

Vou deixar tudo pronto. O secret `GRUPOZAP_LEAD_TOKEN` fica **opcional**: enquanto não existir, a function aceita qualquer requisição (modo "homologação aberta") e mostra um aviso no CRM dizendo que o webhook está sem proteção. Assim você consegue validar com o [validador oficial do Grupo OLX](https://developers.grupozap.com/webhooks/endpoint_validator.html) antes mesmo de gerar o token.

## Endpoint

`POST https://qozlwzgesezsygmnuzky.supabase.co/functions/v1/portal-lead-grupozap`

- Público (`verify_jwt = false`).
- **Sem token configurado** → aceita qualquer POST (com aviso visível no CRM).
- **Com token** → exige `?token=XXX` na URL; se errado, responde 401.

## Fluxo da function

1. Lê JSON do corpo.
2. Valida obrigatórios: `name`, telefone (`phone`/`phoneNumber`), `clientListingId`. Faltou → 400 (Grupo OLX reentenga).
3. Normaliza telefone (`ddd + phone` → dígitos BR).
4. Idempotência: se `originLeadId` já existe (coluna nova `portal_origin_lead_id`), responde 200 sem fazer nada.
5. Mapeia `transactionType`: `SELL`→`venda`, `RENT`→`aluguel`.
6. Busca imóvel pelo `clientListingId`:
   - `codigo_imoview` (numérico) → `codigo_interno` → `codigo_auxiliar`.
   - Achou: preenche `imovel_interesse_codigo`, `cidade_interesse`, `bairro_interesse`, `tipo_imovel`, `orcamento_max` = preço.
7. Deduplica por telefone/email com `find_duplicate_lead` (30 dias). Duplicado → grava `lead_interacoes` (tipo `outro`) com a mensagem + originLeadId + leadType + temperatura; **não cria lead novo**, mas grava `portal_origin_lead_id` no lead existente pra travar reenvios.
8. Senão, insere em `leads`:
   - `origem = 'portal'`, `portal_origin = 'grupo_olx'`, `portal_origin_lead_id = originLeadId`
   - `origem_url`: `https://www.zapimoveis.com.br/imovel/{originListingId}` se tiver
   - `observacoes`: bloco com `message`, `temperature`, `leadType`, `originLeadId`, `originListingId`, links IZI/feedback
   - `tags`: `['grupo-olx', leadType, temperature]` + `'lead-certo'` quando aplicável
9. Trigger existente `vincular_interessado_de_lead` cuida do vínculo cliente↔imóvel.
10. Responde 200.

Service role no insert (bypass RLS), CORS liberado, todos erros internos retornam 500 (Grupo OLX reentenga 3x e armazena 14 dias).

## Idempotência (migration já aprovada)

Já adicionei na migration anterior:
- `leads.portal_origin text`
- `leads.portal_origin_lead_id text`
- índice único parcial `(portal_origin, portal_origin_lead_id)`

## UI no CRM (`/crm/portais`)

Novo bloco "Webhook de leads (Grupo OLX)" no topo:

- URL completa com botão copiar. Se token existir, URL inclui `?token=…` (busco o token via edge function `get-webhook-url` pra não expor secret no client; alternativa simples: gero a URL no servidor e a página chama a function pra pegar).
  - **Mais simples**: a página chama a function `portal-lead-grupozap?action=get-url` (GET) que devolve a URL pronta com token mascarado/completo só para usuários admin. Vou nessa.
- Badge de status:
  - 🟡 "Sem token — webhook aberto" enquanto `GRUPOZAP_LEAD_TOKEN` não estiver setado
  - 🟢 "Protegido por token" quando estiver
- Links: validador oficial, formulário de homologação, doc do Grupo OLX.
- Tabela "Últimos leads recebidos via portal" (filtro `portal_origin = 'grupo_olx'`, 20 mais recentes, com tipo de lead, temperatura, imóvel).

## Quando você tiver o token

Você gera qualquer string aleatória (eu sugiro uma na UI com botão "gerar token"), salva em **Lovable Cloud → Secrets** como `GRUPOZAP_LEAD_TOKEN`, e cola a nova URL no painel do Grupo OLX. Function passa a exigir o token automaticamente.

## Arquivos

- `supabase/functions/portal-lead-grupozap/index.ts` (novo)
- `supabase/config.toml` (bloco `verify_jwt = false`)
- `src/crm/pages/Portais.tsx` (bloco webhook + tabela últimos leads)

## Fora deste plano

- Webhook de outros portais (cada um tem contrato próprio; estrutura `portal_origin` já está pronta).
- Reenvio sob demanda (precisa abrir chamado no Grupo OLX).
