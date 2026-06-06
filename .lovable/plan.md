# Importar todos os imóveis do Imoview para o banco

## Objetivo
Mirror completo do estoque Imoview no banco (`imoveis_proprios` unificada) + fotos no Storage (`imoveis-fotos`), com sync **manual** disparado pelo admin. Após a carga, o site público lê do banco e não depende mais da API Imoview no caminho crítico.

## Decisões confirmadas
- Unificar em `imoveis_proprios` (`origem` + `codigo_imoview`).
- Baixar fotos para Storage (`imoveis-fotos`, já existe — torná-lo público para leitura).
- Sync **só manual** (botão no CRM para admin/gestor).

## 1. Schema (migration)

Adicionar à `imoveis_proprios`:
- `origem` text not null default `'proprio'` (`'proprio' | 'imoview'`)
- `codigo_imoview` integer unique (null para próprios)
- `imoview_raw` jsonb — payload bruto para debug/re-mapeamento futuro
- `imoview_sync_at` timestamptz
- `imoview_hash` text — hash do payload para skip de updates redundantes
- `condominio_nome` text
- `aceita_permuta` boolean default false
- `valor_m2` numeric (gerado/copiado)
- `data_atualizacao_origem` timestamptz

Índices:
- `idx_imoveis_codigo_imoview` em `codigo_imoview`
- `idx_imoveis_origem_status` em `(origem, status, ativo)`
- GIN em `to_tsvector('portuguese', titulo || ' ' || descricao || ' ' || bairro || ' ' || cidade)` para busca
- `idx_imoveis_preco`, `idx_imoveis_cidade_bairro`, `idx_imoveis_tipo_finalidade`

RLS já cobre leitura pública (`imoveis_public_read`). Manter.

Bucket `imoveis-fotos` → tornar público (Storage update); policy de leitura pública em `storage.objects`.

Tabela auxiliar `imoview_sync_log`:
- `id`, `started_at`, `finished_at`, `status` (`running|ok|partial|error`)
- `total`, `inserted`, `updated`, `unchanged`, `removed`, `photos_uploaded`, `errors_count`
- `triggered_by` (uuid), `error_details` jsonb

## 2. Edge function `imoview-sync` (nova)

Disparada pelo CRM (admin/gestor). Modos:
- `mode: 'full'` — varre tudo
- `mode: 'incremental'` — usa `listarImoveisRecentes` (default 7 dias)
- `mode: 'single', codigo: N` — re-sincroniza um imóvel

Fluxo full:
1. Abre `imoview_sync_log` (`running`).
2. Itera por finalidade (Venda=2, Aluguel=1), paginando `Imovel/RetornarImoveis` (50/página, em lotes paralelos de 3) até esgotar.
3. Para cada imóvel:
   - Mapeia com a mesma função `mapImoviewProperty` existente (reaproveitar de `imoview-api`).
   - Calcula `hash` (SHA-256 do payload normalizado). Se `hash` igual ao salvo → marca `unchanged`, pula.
   - Faz mirror das fotos: para cada URL nova, baixa, gera path `imoview/{codigo}/{idx}-{slug}.jpg`, faz upload com `upsert`. Mantém URLs já espelhadas (skip se path já existe). Atualiza `fotos` no banco para o array de URLs públicas do Storage.
   - `upsert` em `imoveis_proprios` por `codigo_imoview` com `origem='imoview'`.
4. Após varrer tudo, marca `removed=true` (ou `ativo=false`, `status='inativo'`) para `origem='imoview'` cujos códigos não apareceram no run (com flag `_seen_in_sync` na tabela `imoview_sync_log` ou via tabela temporária de códigos vistos).
5. Fecha log com contagens.

Retry/timeout:
- Função roda assíncrona; retorna `sync_id` imediato e processa em background (`EdgeRuntime.waitUntil`).
- CRM faz polling no `imoview_sync_log` via Supabase.

Limites: Edge Function tem ~150s wall-time. Se o catálogo for grande, dividir em "chunks" por cidade ou finalidade, com novo invoke após cada chunk (retomada via cursor salvo em `imoview_sync_log.cursor`).

Secrets necessários: `IMOVIEW_API_KEY` (já existe), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (já existe).

## 3. Camada de leitura (frontend)

Trocar consumidores de `services/imoviewApi.ts` por consultas Supabase ao `imoveis_proprios`:
- Novo `src/services/imoveisDb.ts` espelhando a API atual (`listarImoveis`, `listarImoveisRecentes`, `obterDetalhes`, `listarTipos`, `listarCidades`, `listarCondominios`).
- Filtros, ordenação e paginação 100% em SQL (`.ilike`, `.in`, `.gte/lte`, `.order`, `.range`). Busca textual via `textSearch('search_vector', q, { type: 'websearch', config: 'portuguese' })` se quisermos full-text; senão `or(...ilike)`.
- Cidades/tipos/condomínios: derivar via `select distinct` em views ou usar tabelas `condominios_cache` já existente (manter).

Substituir arquivo por arquivo nos 14 consumidores listados, mantendo a mesma interface (`ImoviewProperty`, `ImoviewListResult`) para minimizar refactor visual.

Edge function `imoview-api` é mantida temporariamente como fallback (admin pode comparar), mas o site público para de chamar.

## 4. UI no CRM

Nova página `src/crm/pages/SincronizacaoImoview.tsx` (rota `/crm/configuracoes/imoview`, link na Sidebar dentro de Configurações ou item próprio se admin):
- Card "Importar do Imoview" com:
  - Botões: **Sincronização completa** / **Incremental (últimos 7 dias)** / **Re-sincronizar imóvel por código**
  - Status do último sync (badge: ok/erro/em andamento, contagens, duração)
  - Tabela com últimos 20 runs (`imoview_sync_log`)
- Durante run em andamento: polling a cada 3s mostrando progresso (lidos/inseridos/atualizados/fotos).
- Confirmação modal antes de full sync.
- Guardado por `useRoles` admin/gestor.

## 5. Migração inicial (operação)

Após deploy:
1. Admin abre a página e dispara "Sincronização completa" — pode levar várias rodadas (a função se auto-reinvoca via cursor).
2. Frontend continua funcional pela API enquanto o banco se popula.
3. Quando log mostrar `status='ok'` e total ≈ catálogo Imoview, fazer cutover do site para `imoveisDb.ts`.

## 6. Fora do escopo
- Não remover `imoview-api` edge function (fica como ferramenta admin/fallback).
- Não tocar lógica do CRM (`Leads`, `Tarefas`, etc.).
- Não alterar tema visual.
- Sync automático (cron) fica para depois.

## 7. Riscos & mitigação
- **Volume de fotos**: pode ser GB. Mitigado por: skip se path já existe, hash de payload, upload paralelo limitado (4 simultâneos), `Cache-Control: public, max-age=31536000`.
- **Timeout edge function**: cursor + auto-reinvoke por chunk.
- **Edição manual de imóvel `origem='imoview'` perdida no próximo sync**: documentar que imóveis Imoview são read-only no CRM (badge "Sincronizado do Imoview"); só `origem='proprio'` é editável. Próprios passam por sync sem tocar.
- **Bucket público**: se workspace bloqueia public buckets, usar signed URLs com TTL longo ou manter privado + endpoint proxy.

## 8. Ordem de implementação
1. Migration (schema + índices + sync_log) e tornar bucket público.
2. Edge function `imoview-sync` com cursor e mirror de fotos.
3. Página CRM `/crm/configuracoes/imoview` com botões e polling.
4. `src/services/imoveisDb.ts` espelhando contrato atual.
5. Trocar imports nos 14 arquivos consumidores.
6. Validação: rodar sync completo, abrir `/imoveis`, conferir filtros e detalhes.
