## Objetivo

Criar um novo módulo **Clientes** no CRM (sidebar), importar do Imoview proprietários, compradores/interessados, locatários e contatos gerais, e mantê-los vinculados aos imóveis como no Imoview.

Módulo independente do Leads (Leads = funil de prospecção; Clientes = base de pessoas reais ligadas a imóveis/contratos).

## Banco de dados

### Tabela `clientes`
Pessoas/contatos importados do Imoview ou cadastrados manualmente.

Campos principais:
- `nome`, `cpf_cnpj`, `rg`, `email`, `telefone`, `telefone_secundario`, `data_nascimento`
- `tipo_pessoa` (`fisica` | `juridica`)
- `endereco`, `bairro`, `cidade`, `estado`, `cep`
- `observacoes`
- `categorias` (array): `proprietario`, `comprador`, `locatario`, `interessado`, `contato` — um cliente pode ter múltiplas categorias (como no Imoview)
- `codigo_imoview` (int, único) — ID original
- `imoview_raw` (jsonb), `imoview_sync_at`, `imoview_hash`
- `ativo`, `created_at`, `updated_at`, `created_by`

Índices: `codigo_imoview` (único), `cpf_cnpj`, `telefone`, `email`.

### Tabela `cliente_imoveis` (relação N:N com papel)
Vincula cliente a imóvel com o papel exato (espelha o Imoview):
- `cliente_id` → `clientes.id`
- `imovel_id` → `imoveis_proprios.id`
- `papel` enum: `proprietario`, `comprador`, `locatario`, `interessado`
- `percentual` (numeric, para co-proprietários)
- `data_inicio`, `data_fim` (para histórico de compra/locação)
- `observacoes`
- único `(cliente_id, imovel_id, papel)`

### RLS
- SELECT: admin, gestor, corretor (`is_crm_user` + role check)
- INSERT/UPDATE/DELETE: admin, gestor, corretor
- Atendente: sem acesso
- Service role: full (para edge function de sync)

GRANT para `authenticated` e `service_role`.

## Edge Function: `imoview-sync-clientes`

Nova função separada (não mistura com sync de imóveis).

Endpoints Imoview a testar (em ordem de fallback):
- `/Pessoa/RetornarPessoas` (lista paginada geral)
- `/Pessoa/RetornarPessoasAlteradas` (incremental)
- `/Pessoa/RetornarDetalhesPessoa?codigo=...` (detalhes + imóveis vinculados)
- `/Proprietario/RetornarProprietarios` (fallback caso só esse esteja habilitado)

Fluxo:
1. Lista todas as pessoas paginadas (cursor + auto-reinvoke, mesmo padrão de `imoview-sync`).
2. Para cada pessoa, busca detalhes e extrai vínculos (`imoveis`, `tipo`/`categoria`).
3. Upsert em `clientes` por `codigo_imoview`.
4. Para cada vínculo retornado, upsert em `cliente_imoveis` casando `codigo_imoview` do imóvel com `imoveis_proprios.codigo_imoview`.
5. Categorias derivadas: marca `proprietario` se a pessoa tem imóveis como dono, `comprador`/`locatario` se aparece em contrato finalizado, `interessado` para registros de interesse.
6. Log em `imoview_sync_log` reaproveitado (novo `mode: 'clientes_full' | 'clientes_incremental'`).

Modos: `full`, `incremental` (alterados nos últimos 7 dias), `single` (um código).

## Frontend

### Sidebar (`src/crm/components/CrmSidebar.tsx`)
Novo item entre "Imóveis" e "Condomínios":

```text
- Imóveis
- Clientes        ← novo (icon: Users / Contact)
- Condomínios
```

Visível para roles: `admin`, `gestor`, `corretor`.

### Rotas (`src/App.tsx`)
- `/crm/clientes` → lista
- `/crm/clientes/novo` → form
- `/crm/clientes/:id` → detalhe
- `/crm/clientes/:id/editar` → form

### Páginas

**`Clientes.tsx` (lista)**
- Tabela com: nome, categorias (badges), telefone, email, cidade, # imóveis vinculados, atualizado em
- Filtros: busca (nome/CPF/email/telefone), categoria (multi), cidade, origem (Imoview/manual)
- Paginação cliente-side, ordenação

**`ClienteDetail.tsx`**
- Dados pessoais
- Aba "Imóveis vinculados": lista por papel (Propriedades, Como comprador, Como locatário, Interesses)
  - Cada linha clicável → `/crm/imoveis/:id`
- Aba "Atividades" (futuras interações ligadas ao cliente)
- Botão "Re-sincronizar do Imoview" (se `codigo_imoview` setado)

**`ClienteForm.tsx`**
- Cadastro manual com mesmas seções; categorias como toggles
- Seleção de imóveis vinculados com escolha de papel

### Página de Imóvel (`ImovelDetail.tsx`)
Adicionar seção "Pessoas vinculadas":
- Proprietário(s) com link para `/crm/clientes/:id`
- Comprador/Locatário se houver
- Lista de interessados

### Sincronização (`SincronizacaoImoview.tsx`)
Adicionar segundo card "Sincronização de Clientes":
- Botão "Sincronização completa de clientes"
- Botão "Incremental (últimos 7 dias)"
- Histórico filtrado pelos novos `mode` clientes

### Hook/lib (`src/crm/lib/clientes.ts`)
- `listClientes(filters)`, `getCliente(id)`, `upsertCliente(data)`, `linkImovel(clienteId, imovelId, papel)`, `unlinkImovel(id)`, `triggerSyncClientes(mode)`

## Segurança

- Telefone/email/CPF são dados sensíveis: tabela protegida por RLS exigindo `is_crm_user` + role em (admin, gestor, corretor).
- Atendente bloqueado.
- Sem leitura anônima.

## Entrega em fases

1. **Migration** (tabelas + RLS + enum `cliente_papel`).
2. **Edge function** `imoview-sync-clientes` com fallback de endpoints.
3. **Sidebar + rotas + páginas** (lista, detalhe, form).
4. **Vínculo na página de imóvel** (seção "Pessoas vinculadas").
5. **Card no painel de sincronização** + primeira execução completa.

Sem alterações no site público, no módulo Leads ou no schema atual de `imoveis_proprios`.
