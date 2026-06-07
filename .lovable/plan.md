# Importar clientes do Imoview via fluxo App_ (login)

A API pública não tem endpoint de listagem em massa de clientes. A única forma de listar é o conjunto `/Cliente/App_*`, que exige um **login real de usuário do Imoview CRM** (email + senha) para obter um `codigoacesso`.

## 1. Credenciais (secrets)

Vou pedir 2 novos secrets via tool de secrets:
- `IMOVIEW_APP_EMAIL` — email do usuário Imoview CRM
- `IMOVIEW_APP_SENHA` — senha desse usuário

A `IMOVIEW_API_KEY` (chave) já existe.

## 2. Adaptar `supabase/functions/imoview-sync-clientes/index.ts`

Trocar as 3 tentativas atuais (`/Pessoa/...`, `/Cliente/Retornar...`, `/Proprietario/...` — todas 404) por:

1. **Login** uma vez por execução:  
   `GET /Usuario/App_ValidarAcesso?email=...&senha=...` → guardar `codigoacesso`.
2. **Listar pessoas físicas:**  
   `GET /Cliente/App_RetornarPessoas` paginado (header `codigoacesso`).
3. **Listar pessoas jurídicas:**  
   `GET /Cliente/App_RetornarEmpresas` paginado (mesmo header).
4. **Detalhe (opcional, p/ vínculos com imóveis):**  
   `GET /Cliente/App_RetornarDetalhesCliente?codigo=...` quando o item da lista não traz tudo.

O resto do fluxo (cursor, hash dedup, `clientes` + `cliente_imoveis`, modos `full`/`incremental`/`single`, auto-reinvoke por chunks, log em `imoview_sync_log`) continua igual.

## 3. Robustez

- Cachear `codigoacesso` em memória da execução (uma autenticação por chunk).
- Se receber 401 em meio da execução, refazer login e tentar de novo (1x).
- Logar shape do primeiro item de cada endpoint p/ ajustar `mapRow` se nomes de campos forem diferentes (`pessoaFisica` vs `pessoa`, etc.).
- Modo `incremental` tenta `App_RetornarPessoasAlteradas` se existir; se 404, faz `full` mesmo (já cobrimos pelo hash).

## 4. Teste e validação

- Rodar `mode: 'full'` com a edge function atualizada.
- Confirmar contagem em `clientes` e em `cliente_imoveis`.
- Mostrar o log em `imoview_sync_log` (inserted/updated/errors).

## Arquivos afetados

- `supabase/functions/imoview-sync-clientes/index.ts` (reescrita das funções `fetchListing` / `fetchListingIncremental` / `fetchDetails` + nova helper de login)
- Novos secrets: `IMOVIEW_APP_EMAIL`, `IMOVIEW_APP_SENHA`

## Risco / dependência

Tudo depende do `/Usuario/App_ValidarAcesso` aceitar as credenciais. Se sua conta tem **2FA obrigatório**, o fluxo App_ exige código de acesso por SMS/email e não funciona sem intervenção humana — nesse caso voltamos para a opção 2 (importar CSV exportado do painel).

Confirme aprovar este plano para eu pedir os 2 secrets e implementar.
