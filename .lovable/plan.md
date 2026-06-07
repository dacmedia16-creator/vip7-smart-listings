## Objetivo
Importar do Imoview também imóveis **vendidos, alugados, sob proposta e inativos**, mantendo-os visíveis apenas no CRM (não no site público).

## Estratégia

### 1. Listagem de "todos os imóveis"
A API atual usa `RetornarImoveisDisponiveis` (só ativos). O Imoview expõe `RetornarImoveis` (lista geral, sem filtro de disponibilidade) com paginação. Vamos adicionar uma segunda passagem usando esse endpoint para capturar os demais.

```text
fase 1 — RetornarImoveisDisponiveis   → status disponivel/sob_proposta
fase 2 — RetornarImoveis (todos)      → marca vendido/alugado/inativo
```

Caso `RetornarImoveis` não esteja habilitado para a conta, fallback: usar `RetornarImoveisAlterados` (últimos 365 dias) que já entrega o campo `situacao` para inferência.

### 2. Detalhes
Trocar `RetornarDetalhesImovelDisponivel` por `RetornarDetalhesImovel` (sem o "Disponivel"). Esse endpoint retorna o registro independente do status, e inclui o campo `situacao`/`statusimovel`.

### 3. Mapeamento de status
Em `mapToRow`, deixar de cravar `status: 'disponivel'` e derivar de `raw.situacao` / `raw.statusimovel`:

```text
"Disponível" / "Ativo"        → disponivel
"Sob proposta" / "Reservado"  → sob_proposta
"Vendido"                     → vendido
"Alugado"                     → alugado
"Inativo" / "Suspenso" / "Bloqueado" / outros → inativo
```

`ativo` continua `true` (o flag `ativo=false` permanece reservado para "sumiu da API").

### 4. Política RLS — manter site público intacto
A policy `imoveis_public_read` já filtra por `status IN ('disponivel','sob_proposta')`, então vendidos/alugados/inativos **não aparecem** no site público automaticamente. Nenhuma mudança de RLS necessária.

A policy CRM `imoveis_crm_read_all` permite que admin/gestor/corretor vejam todos.

### 5. UI no CRM
Listagem `/crm/imoveis` já tem filtro por status. Garantir que o filtro mostra todas as opções (`IMOVEL_STATUS`) — verificar o `Select` em `Imoveis.tsx`.

### 6. Página de Sincronização
Adicionar ao painel `SincronizacaoImoview` o contador por status após o sync, para visibilidade.

## Mudanças técnicas

- `supabase/functions/imoview-sync/index.ts`
  - Nova função `fetchListingAll(finalidade, pagina)` chamando `/Imovel/RetornarImoveis` com fallback para `RetornarImoveisDisponiveis`.
  - Loop de sync passa a iterar `RetornarImoveis` para cobrir todos os status.
  - `fetchDetails` → usar `RetornarDetalhesImovel` (com fallback ao `Disponivel`).
  - `mapToRow`: derivar `status` de `raw.situacao || raw.statusimovel`.
  - Remover o "burying" forçado em `ativo=true` apenas quando a situação for inativa — manter `ativo=true`, e usar `status='inativo'`.

- `src/crm/pages/SincronizacaoImoview.tsx`
  - (Opcional) exibir contagens por status do último log.

Sem mudanças em: site público, hooks de filtro, RLS, schema.

## Entrega
1. Patch da edge function `imoview-sync` com novos endpoints e mapeamento de status.
2. Botão "Sincronizar tudo" continua o mesmo — agora cobre todo o catálogo.
