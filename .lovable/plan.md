# Integração de Leads — Grupo OLX (Zap / VivaReal / OLX)

O Grupo OLX entrega leads via **HTTP POST** num endpoint nosso, com JSON único por lead. Vou criar uma edge function pública que recebe esse POST, valida e grava na tabela `leads`, reaproveitando a deduplicação e o roteamento que já existe.

## Endpoint

`POST https://qozlwzgesezsygmnuzky.supabase.co/functions/v1/portal-lead-grupozap`

- Pública (`verify_jwt = false`) — Grupo OLX não envia auth.
- Proteção: query string `?token=XXX` validado contra secret `GRUPOZAP_LEAD_TOKEN`. URL final que você envia pro Grupo OLX:
  `…/portal-lead-grupozap?token=XXX`
- Responde **200** assim que grava, **4xx** se faltar `clientListingId` ou payload inválido (conforme spec — 4xx faz o Grupo OLX reenviar/armazenar por 14 dias), **5xx** em erro inesperado (também dispara retry deles, que tentam 3x).

## Fluxo da function

1. Valida token na query.
2. Lê JSON e valida campos mínimos: `name`, (`phone` ou `phoneNumber`), `clientListingId`.
3. Normaliza telefone (`ddd + phone` → E.164/BR).
4. Mapeia `transactionType`: `SELL`→`venda`, `RENT`→`aluguel`.
5. Busca imóvel pelo `clientListingId` em `imoveis_proprios`:
   - tenta `codigo_imoview` (numérico), depois `codigo_interno` (texto), depois `codigo_auxiliar`.
   - se achou: preenche `imovel_interesse_codigo`, `cidade_interesse`, `bairro_interesse`, `tipo_imovel`, `orcamento_max` (= preço do imóvel).
6. Deduplicação: chama `find_duplicate_lead(telefone, email)`. Se duplicado:
   - cria `lead_interacoes` (tipo `outro`) com a mensagem + originLeadId + leadType + temperatura.
   - **não** cria lead novo.
7. Senão, insere em `leads` com:
   - `origem = 'portal'`
   - `origem_url`: monta `https://www.zapimoveis.com.br/imovel/{originListingId}` quando aplicável, senão deixa null.
   - `observacoes`: bloco formatado com `message`, `temperature`, `extraData.leadType`, `originLeadId`, `originListingId`, links IZI/feedback se vierem.
   - `tags`: `['grupo-olx', leadType.toLowerCase(), temperature.toLowerCase()]` + `'lead-certo'` se `extraData.leadCerto === true`.
8. Se houver regra de distribuição automática ativa, chama `distribuir_lead(lead_id)` (segue padrão do CRM atual; opcional, fica atrás de flag em `app_config`).
9. Trigger existente `vincular_interessado_de_lead` cuida de ligar o imóvel ao cliente se já existir.
10. Loga em `activity_log` (entidade `leads`, ação `criou`/`atualizou` via interação).

## Idempotência

Antes do passo 6, checa se já existe lead com `originLeadId` no campo `observacoes` ou nova coluna dedicada. Para ficar limpo, adiciono coluna:

- `leads.portal_origin_lead_id text` (nullable, unique parcial onde not null) — guarda `originLeadId` do Grupo OLX. Reenvios mesmo após 200 (raro mas possível) não duplicam: function faz `upsert` por essa chave; se já existe, responde 200 sem nada fazer.
- `leads.portal_origin text` — `grupo_olx`, fica pronto pra outros portais (ImovelWeb etc.) terem o mesmo padrão.

## UI no CRM (`/crm/portais`)

No card do Zap/VivaReal/OLX adicionar bloco "Webhook de leads":

- Mostra a URL completa (`…/portal-lead-grupozap?token=…`) com botão copiar.
- Botão "Rotacionar token" (chama `secrets--update_secret` indiretamente — na verdade só re-renderiza orientação; rotação real fica nas Configurações).
- Link pro [validador oficial](https://developers.grupozap.com/webhooks/endpoint_validator.html) e instrução: validar → preencher [formulário de homologação](https://docs.google.com/forms/d/e/1FAIpQLSd6WJ3xw-qoFzW2-6OvrEihTjurUwVsJYei-P4alae2S1yedQ/viewform).
- Tabela mostrando os últimos 20 leads recebidos via portal (filtro `portal_origin = 'grupo_olx'`).

## Detalhes técnicos

**Migration** (`leads`):
- `alter table leads add column portal_origin text, add column portal_origin_lead_id text;`
- `create unique index leads_portal_origin_lead_id_uniq on leads (portal_origin, portal_origin_lead_id) where portal_origin_lead_id is not null;`
- Sem mudança de RLS (já permite insert anon com `corretor_id IS NULL` — mas a function usa service role, então não importa).

**Secret novo**: `GRUPOZAP_LEAD_TOKEN` (gerado aleatório, você cola na configuração do portal).

**Arquivos novos**:
- `supabase/functions/portal-lead-grupozap/index.ts`
- bloco em `supabase/config.toml` com `verify_jwt = false`
- migration acima
- atualização em `src/crm/pages/Portais.tsx` (bloco webhook)
- atualização em `src/crm/lib/portais.ts` se precisar tipos

## Fora deste plano

- Integração de leads de OUTROS portais (ImovelWeb, Chaves na Mão) — cada um tem contrato próprio; faço quando você pedir, reaproveitando a estrutura `portal_origin / portal_origin_lead_id`.
- Resposta ao feedback URL (`extraData.feedback`) — só guardo o link.
- Reenvio sob demanda (a doc do Grupo OLX diz que precisa pedir pra eles).

Confirma que vai usar `codigo_imoview` como `clientListingId` no XML do feed (é o que está hoje em `buildVRSync`)? Se você costuma sobrescrever com `codigo_interno`/`codigo_auxiliar`, eu já incluo o fallback como descrito.
