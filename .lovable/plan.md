
# Evolução do CRM — Fase 1

Adiciona histórico de interações com timeline, dashboard do gestor mais robusto e notificações on-demand por Email (Resend) e WhatsApp (ZionTalk), sem cron.

## 1. Banco de dados

Estender `lead_interacoes` (mantém RLS e dados atuais):

- `resultado` text — ex: `sem_resposta`, `interessado`, `agendado`, `descartado`
- `notas_internas` text — visível só para CRM
- `duracao_minutos` int
- `proxima_acao_em` timestamptz — data sugerida para próximo contato
- `updated_at` timestamptz default now() + trigger `update_updated_at_column`

Atualizar coluna `last_contact_at` do lead automaticamente quando uma nova interação for inserida (trigger `AFTER INSERT`).

Nenhum CREATE TABLE novo nesta fase.

## 2. Timeline de interações no detalhe do lead

Em `LeadDetail`, nova seção "Histórico" com:

- Formulário rápido: tipo (ligação/WhatsApp/email/visita/outro), descrição, resultado, duração, notas internas, próxima ação.
- Timeline vertical agrupada por dia, ícone por tipo, autor (nome do profile) e badge de resultado.
- Filtro por tipo e por autor.
- Botões de atalho ao registrar: "Ligar" (tel:) e "WhatsApp" (wa.me com telefone do lead) — apenas links, sem envio automático.

## 3. Dashboard do gestor

Reescrita do `Dashboard` (somente para admin/gestor; corretor/atendente veem versão simplificada já existente):

- 4 cards de KPI: leads novos (7d), leads em negociação, taxa de conversão (fechamento / total etapas), tarefas atrasadas.
- Card "Leads sem contato há +3 dias" (lista clicável).
- Card "Leads atrasados na etapa" (mais de 7 dias sem mudança de `status_funil`).
- Gráfico de barras (recharts) — leads por etapa do funil.
- Gráfico de linha — novos leads por dia (últimos 30d).
- Ranking de corretores por leads ativos.

Todas as queries via React Query com filtros já permitidos pelas RLS atuais.

## 4. Notificações on-demand

### 4.1 Email — edge function `send-lead-email`
Usa `RESEND_API_KEY` (já configurada). Templates simples inline (HTML) para:

- **Lead atribuído** — corretor recebe dados do lead.
- **Mudança de etapa** — gestor + corretor recebem.
- **Nova tarefa atribuída** — responsável recebe.

Disparo on-demand via `supabase.functions.invoke` nos pontos:
- ao atualizar `corretor_id` em leads;
- ao mudar `status_funil`;
- ao criar tarefa.

### 4.2 WhatsApp — edge function `send-whatsapp-ziontalk`
Novo secret `ZIONTALK_API_KEY` (solicitado ao usuário). Chamada:

```
POST https://app.ziontalk.com/api/send_message/
Authorization: Basic base64(ZIONTALK_API_KEY + ":")
form-data: msg=<texto>, mobile_phone=<E.164>
```

Mensagens disparadas nos mesmos eventos do email (lead atribuído, mudança de etapa, nova tarefa) para o telefone do corretor (em `profiles.telefone`).

### 4.3 Preferências de notificação
Adicionar em `profiles` colunas `notif_email boolean default true` e `notif_whatsapp boolean default true`. UI em Configurações > Perfil para o usuário desligar cada canal. Edge functions respeitam essas flags.

## 5. Detalhes técnicos

- Migração 1: alterações em `lead_interacoes`, trigger `last_contact_at`, colunas `notif_*` em `profiles`.
- Edge functions novas: `send-lead-email`, `send-whatsapp-ziontalk`. Ambas com `getClaims()` para garantir usuário autenticado, validação com Zod e CORS.
- Hooks novos: `useLeadInteracoes(leadId)`, `useDashboardMetrics()`, `useNotify()` (wrapper que chama email + whatsapp respeitando prefs).
- Componentes novos: `InteracaoForm`, `InteracaoTimeline`, `LeadsSemContatoCard`, `LeadsAtrasadosCard`, `FunilBarChart`, `LeadsLineChart`, `RankingCorretores`.
- Sem alterações nas policies RLS existentes (continua via `is_crm_user`/`has_role`).
- Secret necessário: `ZIONTALK_API_KEY` (pedirei após aprovação do plano).

## 6. Fora do escopo (próximas fases)
Busca global (Cmd+K), relatórios avançados, cron de lembretes, Twilio, agenda drag&drop, export PDF, refactor UI.
