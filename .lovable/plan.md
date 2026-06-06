# Plano: CRM Imobiliário em /crm (Fases 1+2)

CRM completo convivendo com o site público atual. Acesso restrito por login em rotas `/crm/*`. Leads dos formulários do site (Avaliação, Contato, WhatsApp) caem automaticamente no CRM. Imóveis do CRM são cadastrados manualmente (separados dos do Imoview).

## Entregas

### Entrega 1 — Fundação (Backend + Auth + Setup Admin)
- Tabelas, roles, RLS, storage
- Login/logout, tela de setup do primeiro admin
- Layout do CRM com sidebar

### Entrega 2 — Leads, Funil Kanban, Imóveis Próprios
- CRUD de leads com filtros, tags, histórico, detecção de duplicados
- Funil Kanban drag-and-drop + visão lista
- CRUD de imóveis próprios com upload de fotos

### Entrega 3 — Tarefas, Agenda, Distribuição, Dashboard
- Sistema de tarefas/follow-ups com lembretes
- Agenda do corretor (mês/semana/dia)
- Regras de distribuição automática de leads
- Dashboards (gestor e corretor) com gráficos
- Captura automática de leads dos formulários públicos

## Arquitetura

### Rotas novas (todas em `/crm/*`)
```
/crm/setup              → criar primeiro admin (só funciona se não houver admin)
/crm/login              → login email/senha
/crm/                   → dashboard (varia por role)
/crm/leads              → lista + filtros
/crm/leads/novo
/crm/leads/:id          → detalhe + histórico + tarefas
/crm/funil              → Kanban
/crm/imoveis            → lista
/crm/imoveis/novo
/crm/imoveis/:id/editar
/crm/tarefas            → todas as tarefas
/crm/agenda             → calendário
/crm/relatorios         → dashboards e gráficos
/crm/configuracoes      → usuários, regras de distribuição, tags
```

Site público (`/`, `/imoveis`, `/avaliacao`, etc.) permanece inalterado.

### Stack
- shadcn/ui (já no projeto), Tailwind (tema neutro azul/cinza só dentro de `/crm`, mantendo o tema dourado do site público via classe wrapper)
- `@dnd-kit/core` para Kanban (mais leve e mantido vs react-beautiful-dnd)
- `recharts` para gráficos
- `react-day-picker` (já instalado via shadcn calendar) para agenda
- `zod` + `react-hook-form` para validação
- Lovable Cloud (Supabase) para DB, auth, storage, realtime

### Banco de dados

**Enum:** `app_role` = `admin | gestor | corretor | atendente`

**Tabelas (todas com RLS + GRANT):**
- `profiles` (id=auth.uid, nome, email, telefone, ativo, especialidades[], created_at)
- `user_roles` (user_id, role) — separada, com `has_role()` security definer
- `leads` (id, nome, email, telefone, origem, tipo_imovel, bairro_interesse, cidade_interesse, orcamento_min, orcamento_max, perfil_busca, status_funil, corretor_id, tags[], observacoes, created_at, updated_at, last_contact_at)
- `lead_interacoes` (id, lead_id, tipo[ligacao/whatsapp/email/visita/nota], descricao, autor_id, created_at)
- `lead_documentos` (id, lead_id, nome, url, mime, uploaded_by, created_at)
- `lead_distribuicoes` (id, lead_id, corretor_id, tipo_distribuicao, distribuido_por, created_at)
- `tarefas` (id, lead_id?, imovel_id?, titulo, descricao, tipo, data_hora, responsavel_id, prioridade, status, lembrete_enviado, created_at)
- `imoveis_proprios` (id, codigo_interno, titulo, descricao, tipo, finalidade, cep, endereco, bairro, cidade, latitude, longitude, area, quartos, suites, banheiros, vagas, preco, condominio, iptu, caracteristicas[], video_url, fotos[], documentos[], status, corretor_id, destaque, ativo, created_at, updated_at)
- `tags` (id, nome, cor) — tags reutilizáveis
- `distribuicao_regras` (id, nome, tipo[rodizio/especialidade/equipe/carga], config jsonb, ativo)
- `activity_log` (id, user_id, acao, entidade, entidade_id, dados jsonb, created_at)

**Storage buckets (privados, com RLS):**
- `imoveis-fotos` (público para leitura no site)
- `lead-documentos` (privado, só autenticados do CRM)

**RLS resumida:**
- Admin/Gestor: full access
- Corretor: vê só seus leads/tarefas/imóveis; vê todos os imóveis disponíveis
- Atendente: cria leads, vê leads não atribuídos + os seus
- Setup: tabela `user_roles` vazia → função `setup_first_admin(user_id)` permite promover o primeiro usuário

### Fluxo de setup do primeiro admin
1. `/crm/setup` checa via RPC `count_admins()` se já existe admin
2. Se não, mostra form de cadastro (email/senha/nome)
3. Após signup, chama RPC `setup_first_admin()` que insere role admin **somente se ainda não houver nenhum admin**
4. Se já houver admin, rota redireciona para `/crm/login`

### Captura de leads do site público
- Formulário de avaliação (`/avaliacao`) e contato (`/contato`) passam a inserir em `leads` com `origem='site_avaliacao'` ou `origem='site_contato'`
- Cliques no WhatsApp opcionalmente registram lead (com confirmação leve)
- Detecção de duplicados: ao inserir, busca por telefone/email — se existir há <30 dias, adiciona como nova interação no lead existente

### Integração com Imoview no CRM
- Tela de imóveis do CRM mostra **apenas** `imoveis_proprios` (cadastro manual)
- Leads podem ser vinculados a imóveis: dropdown lista próprios + busca por código Imoview (read-only reference)

## Detalhes técnicos por entrega

### Entrega 1 — Fundação
Arquivos:
- Migration única com: enum, todas as tabelas, GRANTs, RLS, `has_role()`, `setup_first_admin()`, `count_admins()`, triggers `updated_at`, trigger de auto-criar profile no signup, `activity_log` trigger genérico
- Buckets `imoveis-fotos` (público) e `lead-documentos` (privado) + policies
- `src/crm/` — pasta isolada do CRM
  - `CrmLayout.tsx` (sidebar + header + busca global)
  - `CrmSidebar.tsx` (NavLink por role)
  - `hooks/useAuth.ts`, `useRole.ts`, `useRequireRole.tsx`
  - `pages/Setup.tsx`, `pages/Login.tsx`, `pages/Dashboard.tsx` (placeholder)
- Rotas adicionadas em `App.tsx` dentro de `/crm/*` com guard

### Entrega 2 — Leads + Funil + Imóveis
- `pages/Leads.tsx` (DataTable shadcn, filtros, busca, paginação server-side)
- `pages/LeadNovo.tsx` / `pages/LeadDetail.tsx` (form zod + abas: dados/histórico/tarefas/documentos)
- `pages/Funil.tsx` (Kanban com @dnd-kit, 5 colunas, atualiza `status_funil` no drop, badges de "novo"/"atrasado")
- `pages/Imoveis.tsx`, `pages/ImovelForm.tsx` (upload múltiplo com preview, drag para reordenar, mapa Mapbox para latlng)
- Hook `useLeads`, `useImoveisProprios` com React Query
- Detecção de duplicados: function `find_duplicate_lead(telefone, email)` retornando id se existir

### Entrega 3 — Tarefas + Dashboard + Distribuição
- `pages/Tarefas.tsx` (lista filtrada por responsável/status/data)
- `pages/Agenda.tsx` (FullCalendar-like usando react-day-picker + lista do dia; views mês/semana/dia)
- Edge function `cron-lembretes-tarefas` (a cada 15min, marca tarefas com `data_hora` em ~1h e envia notificação in-app via realtime + opcionalmente email)
- `pages/Configuracoes/Usuarios.tsx` (gerenciar profiles e roles — só admin)
- `pages/Configuracoes/Distribuicao.tsx` (criar regras)
- RPC `distribuir_lead(lead_id)` aplica regra ativa (rodízio/carga/especialidade)
- Trigger em INSERT de `leads` chama `distribuir_lead` se `corretor_id` vier nulo
- `pages/Dashboard.tsx` com cards de KPI + gráficos Recharts:
  - Gestor: leads totais, conversão por etapa (funnel), origem (pie), top corretores (bar), previsão de fechamento, leads inativos
  - Corretor: meus leads por etapa, tarefas pendentes, próximos follow-ups, conversões do mês
- `pages/Relatorios.tsx` com filtros de período + exportar CSV (PDF/Excel ficam para Fase 3 — fora deste escopo)
- Integração captura: editar `Avaliacao.tsx` e `Contato.tsx` para fazer INSERT em `leads`

## Fora do escopo (Fase 3 — projeto separado)
- Publicação automática em portais (ImovelWeb/Zap/VivaReal)
- Importação CSV de leads
- Exportação PDF/Excel avançada
- Sincronização Google Calendar
- Dark mode do CRM

## Próximos passos
Começar pela **Entrega 1** (migration + auth + layout). Cada entrega será uma rodada de implementação separada para manter controle e qualidade. Aprovação aqui = começar Entrega 1.
