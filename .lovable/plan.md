## Diagnóstico

- `cliente_imoveis` está vazia: o sync de clientes só encontra vínculos no campo `imoveis` do cadastro do cliente, e os 2.766 clientes importados são leads (vêm sem essa lista).
- O endpoint `RetornarDetalhesImovel` do Imoview retorna `proprietarios: []` na lista — o owner real vem em outro endpoint App_.
- `ImovelForm.tsx` hoje não tem nenhuma área de proprietários.

## Plano

### 1) Nova edge function `imoview-sync-proprietarios`
Para cada imóvel com `codigo_imoview`, busca o(s) proprietário(s) no Imoview via endpoints App_ (login reutiliza `IMOVIEW_APP_EMAIL/SENHA`).

Tenta nesta ordem e fica com o primeiro que retornar array não-vazio (caminho descoberto fica salvo em `imoview_sync_log.error_details` para diagnóstico):

```
/Imovel/App_RetornarProprietariosImovel?codigoImovel=...
/Imovel/App_RetornarDetalhesImovel?codigoImovel=...   (lê .proprietarios)
/Cliente/App_RetornarClientesImovel?codigoImovel=...&tipo=proprietario
```

Para cada proprietário retornado:
- Upsert em `clientes` por `codigo_imoview` (acrescenta `proprietario` em `categorias`, preserva categorias antigas), preenchendo nome, CPF/CNPJ, e-mail, telefone, endereço e `imoview_raw`.
- Upsert em `cliente_imoveis` com `papel='proprietario'`, `percentual` (quando vier) e `onConflict: cliente_id,imovel_id,papel`.

Modos:
- `full`: varre todos `imoveis_proprios` com `codigo_imoview not null`.
- `single`: recebe `codigoImovel` (re-sincroniza um).
- `incremental`: somente imóveis cujo `imoview_sync_at` está nas últimas N horas (default 24h).

Concorrência: lotes de 5 imóveis em paralelo, pequeno delay entre lotes. Registra execução em `imoview_sync_log` reaproveitando colunas existentes (`inserted/updated/unchanged/errors_count/total`).

### 2) Card "Proprietários" em `/crm/sincronizacao-imoview`
Adiciona card com botões **Sync completo** e **Sync incremental** chamando `supabase.functions.invoke('imoview-sync-proprietarios', { body: { mode } })`. Mostra contagem de imóveis com proprietário vinculado (de `cliente_imoveis where papel='proprietario'`).

### 3) Seção "Proprietários" em `ImovelForm.tsx`
Nova seção (collapsible card) acima de "Características", visível tanto em criar quanto editar:

- Lista atual de proprietários vinculados (busca em `cliente_imoveis` por `imovel_id`, join com `clientes`), com nome, telefone (link `wa.me`), e-mail (link `mailto:`), `percentual` editável inline e botão remover (×).
- Botão **"+ Adicionar proprietário"** abre dialog com:
  - Combobox de busca em `clientes` (debounced, usa `listClientes({ search })`).
  - Campo `percentual` opcional.
  - Sub-botão **"+ Criar novo cliente"** — abre dialog inline com nome, CPF/CNPJ, telefone, e-mail; chama `upsertCliente` e já vincula.
- Salvar:
  - Modo **edição**: vínculos persistem imediatamente via `addVinculo`/`removeVinculo` (já existem em `clientes.ts`).
  - Modo **criação**: mantém em estado local; após criar o imóvel, persiste todos os vínculos antes de redirecionar.

### 4) Polimento visual no `PessoasVinculadasCard` (detalhe do imóvel)
Telefone vira link `https://wa.me/55...` e e-mail vira `mailto:` (acesso rápido ao contato do proprietário). Já está visível em `ImovelDetail`.

## Detalhes técnicos

- Sem mudanças de schema. `clientes` e `cliente_imoveis` já têm tudo necessário; RLS de `cliente_imoveis` permite `can_manage_clientes` (admin/gestor/corretor).
- Helpers reutilizados de `imoview-sync-clientes`: `loginApp`, `imoviewApp`, `mapRow`, `pickCodigo`, `asList`, `unwrap`, `sha256Hex` (duplicar dentro do novo arquivo — são ~80 linhas; manter functions independentes evita acoplamento).
- Novo helper em `src/crm/lib/clientes.ts`: `triggerSyncProprietarios(mode, opts?)`.
- A function nova usa `verify_jwt = false` (padrão) e cria o client com `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS (igual ao `imoview-sync-clientes`).
- Limite Imoview: respeitar com `await new Promise(r=>setTimeout(r,250))` entre lotes.

## Arquivos afetados

- `supabase/functions/imoview-sync-proprietarios/index.ts` (novo)
- `src/crm/lib/clientes.ts` (novo helper)
- `src/crm/pages/SincronizacaoImoview.tsx` (novo card)
- `src/crm/pages/ImovelForm.tsx` (nova seção Proprietários + dialog)
- `src/crm/components/PessoasVinculadasCard.tsx` (links WhatsApp/email)
