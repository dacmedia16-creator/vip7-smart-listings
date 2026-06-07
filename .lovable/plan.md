# Condomínios no CRM + vínculo com imóveis

## Objetivo
1. Nova entrada **Condomínios** na barra lateral do CRM.
2. Reimportar todos os condomínios do Imoview (já existe a função `sync-condominios`; 203 hoje em `condominios_cache`).
3. Ligar cada imóvel ao seu condomínio pelo **código Imoview** (campo `codigocondominio` já vem no payload), como o próprio Imoview faz.

## Banco (migration)

`imoveis_proprios`
- Adicionar coluna `codigo_condominio_imoview int` (nullable) + índice.

`condominios_cache`
- Já tem `codigo` (PK numérica do Imoview), `nome`, `cidade`, `cidade_codigo`, `finalidade`. Mantemos.
- Adicionar índice em `nome` e `cidade` para busca rápida.

Backfill: `UPDATE imoveis_proprios SET codigo_condominio_imoview = (imoview_raw->>'codigocondominio')::int WHERE imoview_raw ? 'codigocondominio'`.

## Edge function `imoview-sync`
- No mapeamento de cada imóvel, gravar também `codigo_condominio_imoview = raw.codigocondominio`. Uma linha adicional, nada mais muda no fluxo de sync.

## Edge function `sync-condominios`
- Já existe e funciona (lista cidades → varre condomínios de cada cidade). Vamos:
  - Expor um botão de "Sincronizar agora" na nova página (chama essa função via `supabase.functions.invoke`).
  - Mostrar última atualização lendo `MAX(updated_at)` de `condominios_cache`.

## Frontend

**Sidebar** (`src/crm/components/CrmSidebar.tsx`)
- Novo item `{ title: 'Condomínios', url: '/crm/condominios', icon: Building, roles: ['admin','gestor','corretor'] }` logo após "Imóveis".

**Rota** (`src/App.tsx`)
- `/crm/condominios` → `<RequireAuth><CrmCondominios/></RequireAuth>`
- `/crm/condominios/:codigo` → detalhe do condomínio com lista de imóveis ligados.

**Páginas novas**
1. `src/crm/pages/Condominios.tsx`
   - Tabela: Nome, Cidade, Nº de imóveis (count via `imoveis_proprios.codigo_condominio_imoview = codigo`), última sync.
   - Filtros: busca por nome, filtro por cidade.
   - Botão "Sincronizar do Imoview" (admin/gestor) chamando `sync-condominios`.
   - Paginação client-side.
2. `src/crm/pages/CondominioDetail.tsx`
   - Cabeçalho com nome, cidade, código Imoview.
   - Lista de imóveis vinculados (reuso de cards/linhas já existentes em `/crm/imoveis`), com link para `/crm/imoveis/:id`.

**Hook utilitário**
- `src/crm/hooks/useCondominios.ts` para queries (lista + contagem agregada).

## Fora de escopo
- Sem mudanças no site público (filtro por condomínio público já existe via `condominios_cache`).
- Sem CRUD manual de condomínio (fonte da verdade = Imoview).
- Sem alterar a lógica do sync de imóveis além de gravar o campo novo.
