# Corrigir trava de 1000 leads no Dashboard

## Causa
O `Dashboard.tsx` faz `supabase.from('leads').select(...)` sem paginação. O PostgREST do Supabase retorna no máximo **1000 linhas por requisição** — por isso "Novos leads (7d)" e "Em negociação" travam em 1000, e o pipeline/funil/ranking/tendência ficam subestimados.

## Solução
Substituir o fetch único por queries agregadas no banco. Nada de UI muda — só os números passam a refletir a base completa.

## Mudanças

### 1. Migration: 4 RPCs agregadoras (SECURITY DEFINER)
- `dashboard_funil_counts()` → retorna `(status text, total int)` para cada status do funil.
- `dashboard_pipeline_total()` → `numeric` com `SUM(orcamento_max)` dos leads em aberto.
- `dashboard_leads_por_dia(_dias int)` → `(dia date, total int)` para o gráfico de tendência.
- `dashboard_ranking_corretores(_limit int)` → `(corretor_id uuid, nome text, total int)` dos corretores com mais leads ativos.

Todas com `SET search_path = public` e respeitando regras de acesso (apenas `is_crm_user(auth.uid())` pode chamar — checagem dentro da função).

### 2. Refactor `src/crm/pages/Dashboard.tsx`
Trocar o fetch único por chamadas paralelas:
- **Cards**: 4 counts (`head: true, count: 'exact'`) — novos 7d, em negociação, fechamentos, perdidos. Tarefas atrasadas e total de imóveis já usam count.
- **Pipeline**: chamar `dashboard_pipeline_total()`.
- **Funil**: chamar `dashboard_funil_counts()`.
- **Tendência 30d**: chamar `dashboard_leads_por_dia(30)`.
- **Ranking**: chamar `dashboard_ranking_corretores(8)`.
- **"Sem contato +3d"** e **"Atrasados na etapa +7d"**: já são listas curtas — adicionar os filtros direto na query (`status_funil not in (...)`, `last_contact_at < ...` / `updated_at < ...`) com `.order().limit(8)`, sem trazer todos.

### Fora de escopo
- Mudanças visuais nos cards/gráficos.
- Filtros por corretor/período no dashboard (pode vir depois).
- Otimização das outras telas (Leads, Funil) — só o Dashboard agora.

## Resultado
Números reais mesmo com 50k+ leads, e o dashboard carrega mais rápido (sem baixar milhares de linhas para o cliente).
