# Proprietários nos imóveis — sync via Imoview + card no topo

## Situação atual
- 1.213 imóveis ativos, **0 vínculos** de proprietário em `cliente_imoveis`.
- A edge function `imoview-sync-proprietarios` já existe e usa o endpoint `App_` do Imoview (precisa de `IMOVIEW_APP_EMAIL` + `IMOVIEW_APP_SENHA` válidos — mesma credencial da sync de clientes).
- A aba "Proprietários" no `ImovelForm` já permite vincular manualmente, mas não há resumo visível no topo nem disparador da sync em massa.

## O que entregar

### 1) Página admin para rodar a sync de proprietários
Nova seção em **Importar clientes** (ou ao lado dos cards de sync que já existem) com:
- Botão **"Sincronizar proprietários dos imóveis"** chamando `supabase.functions.invoke('imoview-sync-proprietarios')`.
- Filtros opcionais: "Só imóveis sem proprietário" (default ON) e limite de lote.
- Exibe progresso: total processado, vínculos criados, clientes novos, erros (top 20).
- Bloqueia o botão se `IMOVIEW_APP_SENHA` estiver inválida (mostra link pro formulário de atualizar senha já existente).

### 2) Ajuste fino na edge `imoview-sync-proprietarios`
- Aceitar body `{ onlyMissing?: boolean, limit?: number, imovelIds?: string[] }`.
- Salvar **todos** os campos do contato vindos do Imoview no `clientes` (nome, CPF/CNPJ, RG, email, telefone, telefone_secundario, endereço completo, data_nascimento, `imoview_raw`).
- Dedup por `codigo_imoview` → fallback `cpf_cnpj` → fallback `telefone`.
- Upsert em `cliente_imoveis` com `papel='proprietario'` e `onConflict: cliente_id,imovel_id,papel`.
- Gravar log em `imoview_sync_log` (`mode='proprietarios'`).

### 3) Card "Proprietário(s)" no topo do `ImovelForm`
Acima das abas, novo `Card` mostrando para cada proprietário vinculado:
- Nome + badge de % de participação (se houver).
- Telefone principal (com botão WhatsApp) + telefone secundário.
- Email (com `mailto:`).
- CPF/CNPJ.
- Link "ver cliente" → `/crm/clientes/:id`.
- Se não houver proprietário: estado vazio com botão "Vincular proprietário" que abre a aba Proprietários.

A aba "Proprietários" continua existindo para edição (adicionar/remover).

### 4) (Opcional, baixo custo) Botão por imóvel
Dentro do card do topo, botão **"Buscar no Imoview"** que dispara a sync só para aquele `imovel_id` (usa o mesmo endpoint com `imovelIds`).

## Pré-requisito
A sync **só funciona se o login Imoview estiver OK**. Se a última execução de `imoview-sync-clientes` falhou com 401, primeiro use o formulário de atualizar `IMOVIEW_APP_SENHA` que já está implementado, depois rode esta sync.

## Detalhes técnicos
- **Arquivos a alterar:**
  - `supabase/functions/imoview-sync-proprietarios/index.ts` — aceitar filtros no body, melhorar mapeamento de campos, log em `imoview_sync_log`.
  - `src/crm/pages/ImportarClientes.tsx` — novo card "Sincronizar proprietários".
  - `src/crm/pages/ImovelForm.tsx` — renderizar `<ProprietariosCard imovelId={id} />` antes das abas.
  - `src/crm/components/ProprietariosCard.tsx` — novo componente readonly de resumo + botão "Buscar no Imoview".
  - `src/crm/lib/clientes.ts` — já tem `listVinculosByImovel`; adicionar `syncProprietariosImovel(imovelId)`.
- **Sem migração de schema** — todas as tabelas (`clientes`, `cliente_imoveis`, `imoview_sync_log`) já existem com os campos necessários.
- **RLS:** o card lê via `listVinculosByImovel` (já coberto por `cliente_imoveis_select` + `clientes_select` para usuários CRM).
